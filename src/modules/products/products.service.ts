// src/modules/products/products.service.ts
import { prisma } from '../../config/database';
import { NotFoundError, ForbiddenError, AppError } from '../../types/errors';
import { paginationMeta } from '../../types/api';
import { uploadFileToS3, deleteFileFromS3 } from '../../utils/s3';
import { CreateProductInput, UpdateProductInput, ProductQuery } from './products.dto';
import slugify from '../../utils/slugify';

export class ProductsService {
  async listProducts(query: ProductQuery) {
    const { page, limit, categoryId, search, minPrice, maxPrice, rating, sort, sellerId, featured } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      isPublished: true,
      isApproved: true,
    };

    if (categoryId) where.categoryId = categoryId;
    if (sellerId) where.sellerId = sellerId;
    if (featured !== undefined) where.isFeatured = featured;
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.basePrice = {};
      if (minPrice) where.basePrice.gte = minPrice;
      if (maxPrice) where.basePrice.lte = maxPrice;
    }
    if (rating) where.avgRating = { gte: rating };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { tags: { has: search } },
      ];
    }

    let orderBy: any = { createdAt: 'desc' };
    if (sort === 'price_asc') orderBy = { basePrice: 'asc' };
    else if (sort === 'price_desc') orderBy = { basePrice: 'desc' };
    else if (sort === 'popular') orderBy = { totalSold: 'desc' };
    else if (sort === 'rating') orderBy = { avgRating: 'desc' };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          images: { where: { isPrimary: true }, take: 1 },
          category: { select: { id: true, name: true, slug: true } },
          seller: { select: { id: true, firstName: true, lastName: true, sellerProfile: { select: { shopName: true, slug: true } } } },
          variants: { where: { isActive: true }, take: 1, orderBy: { price: 'asc' } },
        },
      }),
      prisma.product.count({ where }),
    ]);

    return {
      products,
      pagination: paginationMeta(total, page, limit),
    };
  }

  async getProductBySlug(slug: string) {
    const product = await prisma.product.findUnique({
      where: { slug },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        category: true,
        seller: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            sellerProfile: true,
          },
        },
        variants: { where: { isActive: true }, orderBy: { price: 'asc' } },
        reviews: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { id: true, firstName: true, lastName: true, avatar: true } } },
        },
      },
    });

    if (!product) throw new NotFoundError('Product');
    return product;
  }

  async getProductById(id: string) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        category: true,
        variants: { orderBy: { price: 'asc' } },
      },
    });
    if (!product) throw new NotFoundError('Product');
    return product;
  }

  async createProduct(sellerId: string, data: CreateProductInput) {
    const slug = await this.generateUniqueSlug(data.name);

    const product = await prisma.product.create({
      data: {
        sellerId,
        categoryId: data.categoryId,
        name: data.name,
        slug,
        description: data.description,
        basePrice: data.basePrice,
        comparePrice: data.comparePrice,
        sku: data.sku,
        weight: data.weight,
        tags: data.tags,
        metaTitle: data.metaTitle,
        metaDesc: data.metaDesc,
      },
      include: { images: true, variants: true, category: true },
    });

    return product;
  }

  async updateProduct(id: string, sellerId: string, data: UpdateProductInput, role: string) {
    const product = await this.getProductById(id);
    if (role !== 'ADMIN' && product.sellerId !== sellerId) {
      throw new ForbiddenError('You do not own this product');
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        ...data,
        // Reset approval when significant changes are made
        ...(role !== 'ADMIN' && (data.name || data.description || data.basePrice) ? { isApproved: false } : {}),
      },
    });
    return updated;
  }

  async deleteProduct(id: string, sellerId: string, role: string) {
    const product = await this.getProductById(id);
    if (role !== 'ADMIN' && product.sellerId !== sellerId) {
      throw new ForbiddenError('You do not own this product');
    }

    // Delete images from S3
    const images = await prisma.productImage.findMany({ where: { productId: id } });
    await Promise.allSettled(images.map(img => deleteFileFromS3(img.url)));

    await prisma.product.delete({ where: { id } });
  }

  async addImages(productId: string, sellerId: string, files: Express.Multer.File[]) {
    const product = await this.getProductById(productId);
    if (product.sellerId !== sellerId) throw new ForbiddenError('You do not own this product');
    if (!files.length) throw new AppError('No files provided', 400, 'NO_FILES');

    const uploadedImages = await Promise.all(
      files.map(async (file, i) => {
        const url = await uploadFileToS3(file, `products/${productId}`);
        const existingCount = await prisma.productImage.count({ where: { productId } });
        return prisma.productImage.create({
          data: {
            productId,
            url,
            altText: product.name,
            sortOrder: existingCount + i,
            isPrimary: existingCount + i === 0,
          },
        });
      })
    );

    return uploadedImages;
  }

  async deleteImage(productId: string, imageId: string, sellerId: string) {
    const product = await this.getProductById(productId);
    if (product.sellerId !== sellerId) throw new ForbiddenError('You do not own this product');

    const image = await prisma.productImage.findFirst({ where: { id: imageId, productId } });
    if (!image) throw new NotFoundError('Image');

    await deleteFileFromS3(image.url);
    await prisma.productImage.delete({ where: { id: imageId } });
  }

  async approveProduct(id: string, approved: boolean) {
    const product = await this.getProductById(id);
    const updated = await prisma.product.update({
      where: { id },
      data: { isApproved: approved, isPublished: approved },
    });

    // Notify seller
    await prisma.notification.create({
      data: {
        userId: product.sellerId,
        type: approved ? 'PRODUCT_APPROVED' : 'PRODUCT_REJECTED',
        title: approved ? 'Product Approved' : 'Product Rejected',
        body: `Your product "${product.name}" has been ${approved ? 'approved' : 'rejected'}.`,
        data: { productId: id },
      },
    });

    return updated;
  }

  async getSellerProducts(sellerId: string, query: ProductQuery) {
    const { page, limit } = query;
    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where: { sellerId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          images: { where: { isPrimary: true }, take: 1 },
          category: { select: { name: true } },
          variants: { select: { stock: true } },
          _count: { select: { reviews: true, orderItems: true } },
        },
      }),
      prisma.product.count({ where: { sellerId } }),
    ]);

    return { products, pagination: paginationMeta(total, page, limit) };
  }

  private async generateUniqueSlug(name: string): Promise<string> {
    let slug = slugify(name);
    let exists = await prisma.product.findUnique({ where: { slug } });
    let counter = 1;
    while (exists) {
      slug = `${slugify(name)}-${counter++}`;
      exists = await prisma.product.findUnique({ where: { slug } });
    }
    return slug;
  }
}

export const productsService = new ProductsService();
