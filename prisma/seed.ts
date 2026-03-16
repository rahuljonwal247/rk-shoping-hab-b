import { PrismaClient, Role, Prisma } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // PASSWORDS
  const adminHash = await bcrypt.hash('Admin@123', 12)
  const sellerHash = await bcrypt.hash('Seller@123', 12)
  const customerHash = await bcrypt.hash('Customer@123', 12)

  // =============================
  // USERS
  // =============================

  const admin = await prisma.user.upsert({
    where: { email: 'admin@shophub.com' },
    update: {},
    create: {
      email: 'admin@shophub.com',
      passwordHash: adminHash,
      firstName: 'Super',
      lastName: 'Admin',
      role: Role.ADMIN,
      isVerified: true,
    },
  })

  const seller = await prisma.user.upsert({
    where: { email: 'seller@shophub.com' },
    update: {},
    create: {
      email: 'seller@shophub.com',
      passwordHash: sellerHash,
      firstName: 'John',
      lastName: 'Seller',
      role: Role.SELLER,
      isVerified: true,
    },
  })

  const customer = await prisma.user.upsert({
    where: { email: 'customer@shophub.com' },
    update: {},
    create: {
      email: 'customer@shophub.com',
      passwordHash: customerHash,
      firstName: 'Jane',
      lastName: 'Customer',
      role: Role.CUSTOMER,
      isVerified: true,
    },
  })

  // =============================
  // CART
  // =============================

  await prisma.cart.upsert({
    where: { userId: customer.id },
    update: {},
    create: {
      userId: customer.id,
    },
  })

  // =============================
  // SELLER PROFILE
  // =============================

  const sellerProfile = await prisma.sellerProfile.upsert({
    where: { userId: seller.id },
    update: {},
    create: {
      userId: seller.id,
      shopName: 'TechMart',
      slug: 'techmart',
      description: 'Premium electronics and gadgets',
      isVerified: true,
    },
  })

  // =============================
  // CATEGORIES
  // =============================

  const electronics = await prisma.category.upsert({
    where: { slug: 'electronics' },
    update: {},
    create: {
      name: 'Electronics',
      slug: 'electronics',
      description: 'Electronic devices and gadgets',
      sortOrder: 1,
    },
  })

  const clothing = await prisma.category.upsert({
    where: { slug: 'clothing' },
    update: {},
    create: {
      name: 'Clothing',
      slug: 'clothing',
      description: 'Fashion and apparel',
      sortOrder: 2,
    },
  })

  const phones = await prisma.category.upsert({
    where: { slug: 'smartphones' },
    update: {},
    create: {
      name: 'Smartphones',
      slug: 'smartphones',
      parentId: electronics.id,
      sortOrder: 1,
    },
  })

  const laptops = await prisma.category.upsert({
    where: { slug: 'laptops' },
    update: {},
    create: {
      name: 'Laptops',
      slug: 'laptops',
      parentId: electronics.id,
      sortOrder: 2,
    },
  })

  // =============================
  // T-SHIRTS SUBCATEGORY
  // =============================

  const tshirts = await prisma.category.upsert({
    where: { slug: 't-shirts' },
    update: {},
    create: {
      name: 'T-Shirts',
      slug: 't-shirts',
      description: 'Stylish and comfortable t-shirts for every occasion',
      parentId: clothing.id,
      sortOrder: 1,
    },
  })

  // =============================
  // SELLER PROFILE UPDATE (Fashion)
  // =============================

  // Update seller shop to reflect fashion
  await prisma.sellerProfile.update({
    where: { id: sellerProfile.id },
    data: {
      shopName: 'RK Fashion Hub',
      slug: 'rk-fashion-hub',
      description: 'Premium quality t-shirts and fashion apparel',
    },
  })

  // =============================
  // T-SHIRT PRODUCTS
  // =============================

  const classicBlack = await prisma.product.upsert({
    where: { slug: 'classic-black-tshirt' },
    update: {},
    create: {
      sellerId: sellerProfile.id,
      categoryId: tshirts.id,
      name: 'Classic Black T-Shirt',
      slug: 'classic-black-tshirt',
      description: 'A timeless classic black t-shirt made from 100% premium cotton. Soft, breathable, and perfect for everyday wear. Features a comfortable round neck and regular fit.',
      basePrice: new Prisma.Decimal(499),
      comparePrice: new Prisma.Decimal(799),
      isPublished: true,
      isApproved: true,
      isFeatured: true,
      tags: ['t-shirt', 'black', 'classic', 'cotton', 'men', 'casual'],
      avgRating: 4.7,
      totalReviews: 320,
      totalSold: 1500,
    },
  })

  const graphicPrint = await prisma.product.upsert({
    where: { slug: 'graphic-print-tshirt' },
    update: {},
    create: {
      sellerId: sellerProfile.id,
      categoryId: tshirts.id,
      name: 'Urban Graphic Print T-Shirt',
      slug: 'graphic-print-tshirt',
      description: 'Stand out with this bold urban graphic print t-shirt. Made from soft cotton blend fabric with vibrant, fade-resistant printing. Perfect for casual outings and streetwear style.',
      basePrice: new Prisma.Decimal(699),
      comparePrice: new Prisma.Decimal(999),
      isPublished: true,
      isApproved: true,
      isFeatured: true,
      tags: ['t-shirt', 'graphic', 'print', 'streetwear', 'men', 'trendy'],
      avgRating: 4.5,
      totalReviews: 210,
      totalSold: 980,
    },
  })

  const poloTshirt = await prisma.product.upsert({
    where: { slug: 'premium-polo-tshirt' },
    update: {},
    create: {
      sellerId: sellerProfile.id,
      categoryId: tshirts.id,
      name: 'Premium Polo T-Shirt',
      slug: 'premium-polo-tshirt',
      description: 'Elevate your casual look with this premium polo t-shirt. Crafted from pique cotton with a classic collar and two-button placket. Ideal for smart-casual occasions.',
      basePrice: new Prisma.Decimal(899),
      comparePrice: new Prisma.Decimal(1299),
      isPublished: true,
      isApproved: true,
      isFeatured: true,
      tags: ['t-shirt', 'polo', 'premium', 'smart-casual', 'men', 'collar'],
      avgRating: 4.8,
      totalReviews: 180,
      totalSold: 750,
    },
  })

  const oversized = await prisma.product.upsert({
    where: { slug: 'oversized-drop-shoulder-tshirt' },
    update: {},
    create: {
      sellerId: sellerProfile.id,
      categoryId: tshirts.id,
      name: 'Oversized Drop Shoulder T-Shirt',
      slug: 'oversized-drop-shoulder-tshirt',
      description: 'Trendy oversized fit with drop shoulder design. Made from heavyweight 240 GSM cotton for a premium feel. Features a relaxed silhouette perfect for the modern streetwear look.',
      basePrice: new Prisma.Decimal(799),
      comparePrice: new Prisma.Decimal(1199),
      isPublished: true,
      isApproved: true,
      isFeatured: true,
      tags: ['t-shirt', 'oversized', 'drop-shoulder', 'streetwear', 'unisex', 'heavyweight'],
      avgRating: 4.6,
      totalReviews: 290,
      totalSold: 1200,
    },
  })

  const vneck = await prisma.product.upsert({
    where: { slug: 'v-neck-slim-fit-tshirt' },
    update: {},
    create: {
      sellerId: sellerProfile.id,
      categoryId: tshirts.id,
      name: 'V-Neck Slim Fit T-Shirt',
      slug: 'v-neck-slim-fit-tshirt',
      description: 'A sleek v-neck t-shirt with slim fit tailoring. Made from stretchy cotton-elastane blend for a body-hugging comfortable fit. Great for layering or wearing solo.',
      basePrice: new Prisma.Decimal(599),
      comparePrice: new Prisma.Decimal(899),
      isPublished: true,
      isApproved: true,
      isFeatured: false,
      tags: ['t-shirt', 'v-neck', 'slim-fit', 'men', 'stretchy'],
      avgRating: 4.4,
      totalReviews: 150,
      totalSold: 620,
    },
  })

  const stripedTshirt = await prisma.product.upsert({
    where: { slug: 'striped-crew-neck-tshirt' },
    update: {},
    create: {
      sellerId: sellerProfile.id,
      categoryId: tshirts.id,
      name: 'Striped Crew Neck T-Shirt',
      slug: 'striped-crew-neck-tshirt',
      description: 'Classic horizontal striped t-shirt with crew neck. Made from soft cotton jersey with yarn-dyed stripes that never fade. A wardrobe essential for effortless style.',
      basePrice: new Prisma.Decimal(649),
      comparePrice: new Prisma.Decimal(949),
      isPublished: true,
      isApproved: true,
      isFeatured: false,
      tags: ['t-shirt', 'striped', 'crew-neck', 'men', 'casual', 'classic'],
      avgRating: 4.3,
      totalReviews: 95,
      totalSold: 430,
    },
  })

  // =============================
  // T-SHIRT VARIANTS (Sizes & Colors)
  // =============================

  // Classic Black T-Shirt variants
  const classicBlackSizes = [
    { sku: 'CBT-S-BLK', name: 'Small - Black', size: 'S', color: 'Black', price: 499, stock: 50 },
    { sku: 'CBT-M-BLK', name: 'Medium - Black', size: 'M', color: 'Black', price: 499, stock: 80 },
    { sku: 'CBT-L-BLK', name: 'Large - Black', size: 'L', color: 'Black', price: 499, stock: 60 },
    { sku: 'CBT-XL-BLK', name: 'XL - Black', size: 'XL', color: 'Black', price: 549, stock: 40 },
    { sku: 'CBT-XXL-BLK', name: 'XXL - Black', size: 'XXL', color: 'Black', price: 599, stock: 25 },
  ]
  for (const v of classicBlackSizes) {
    await prisma.productVariant.upsert({
      where: { sku: v.sku },
      update: {},
      create: {
        productId: classicBlack.id,
        sku: v.sku,
        name: v.name,
        price: new Prisma.Decimal(v.price),
        stock: v.stock,
        attributes: { size: v.size, color: v.color },
      },
    })
  }

  // Graphic Print T-Shirt variants
  const graphicVariants = [
    { sku: 'GPT-S-WHT', name: 'Small - White', size: 'S', color: 'White', price: 699, stock: 35 },
    { sku: 'GPT-M-WHT', name: 'Medium - White', size: 'M', color: 'White', price: 699, stock: 55 },
    { sku: 'GPT-L-WHT', name: 'Large - White', size: 'L', color: 'White', price: 699, stock: 45 },
    { sku: 'GPT-XL-WHT', name: 'XL - White', size: 'XL', color: 'White', price: 749, stock: 30 },
    { sku: 'GPT-M-BLK', name: 'Medium - Black', size: 'M', color: 'Black', price: 699, stock: 40 },
    { sku: 'GPT-L-BLK', name: 'Large - Black', size: 'L', color: 'Black', price: 699, stock: 35 },
  ]
  for (const v of graphicVariants) {
    await prisma.productVariant.upsert({
      where: { sku: v.sku },
      update: {},
      create: {
        productId: graphicPrint.id,
        sku: v.sku,
        name: v.name,
        price: new Prisma.Decimal(v.price),
        stock: v.stock,
        attributes: { size: v.size, color: v.color },
      },
    })
  }

  // Polo T-Shirt variants
  const poloVariants = [
    { sku: 'PLO-S-NVY', name: 'Small - Navy Blue', size: 'S', color: 'Navy Blue', price: 899, stock: 30 },
    { sku: 'PLO-M-NVY', name: 'Medium - Navy Blue', size: 'M', color: 'Navy Blue', price: 899, stock: 50 },
    { sku: 'PLO-L-NVY', name: 'Large - Navy Blue', size: 'L', color: 'Navy Blue', price: 899, stock: 40 },
    { sku: 'PLO-XL-NVY', name: 'XL - Navy Blue', size: 'XL', color: 'Navy Blue', price: 949, stock: 25 },
    { sku: 'PLO-M-WHT', name: 'Medium - White', size: 'M', color: 'White', price: 899, stock: 35 },
    { sku: 'PLO-L-WHT', name: 'Large - White', size: 'L', color: 'White', price: 899, stock: 30 },
    { sku: 'PLO-M-BLK', name: 'Medium - Black', size: 'M', color: 'Black', price: 899, stock: 40 },
  ]
  for (const v of poloVariants) {
    await prisma.productVariant.upsert({
      where: { sku: v.sku },
      update: {},
      create: {
        productId: poloTshirt.id,
        sku: v.sku,
        name: v.name,
        price: new Prisma.Decimal(v.price),
        stock: v.stock,
        attributes: { size: v.size, color: v.color },
      },
    })
  }

  // Oversized T-Shirt variants
  const oversizedVariants = [
    { sku: 'OVS-M-GRY', name: 'Medium - Grey', size: 'M', color: 'Grey', price: 799, stock: 45 },
    { sku: 'OVS-L-GRY', name: 'Large - Grey', size: 'L', color: 'Grey', price: 799, stock: 55 },
    { sku: 'OVS-XL-GRY', name: 'XL - Grey', size: 'XL', color: 'Grey', price: 849, stock: 35 },
    { sku: 'OVS-M-BLK', name: 'Medium - Black', size: 'M', color: 'Black', price: 799, stock: 50 },
    { sku: 'OVS-L-BLK', name: 'Large - Black', size: 'L', color: 'Black', price: 799, stock: 40 },
    { sku: 'OVS-XL-BLK', name: 'XL - Black', size: 'XL', color: 'Black', price: 849, stock: 30 },
  ]
  for (const v of oversizedVariants) {
    await prisma.productVariant.upsert({
      where: { sku: v.sku },
      update: {},
      create: {
        productId: oversized.id,
        sku: v.sku,
        name: v.name,
        price: new Prisma.Decimal(v.price),
        stock: v.stock,
        attributes: { size: v.size, color: v.color },
      },
    })
  }

  // V-Neck T-Shirt variants
  const vneckVariants = [
    { sku: 'VNK-S-WHT', name: 'Small - White', size: 'S', color: 'White', price: 599, stock: 30 },
    { sku: 'VNK-M-WHT', name: 'Medium - White', size: 'M', color: 'White', price: 599, stock: 45 },
    { sku: 'VNK-L-WHT', name: 'Large - White', size: 'L', color: 'White', price: 599, stock: 35 },
    { sku: 'VNK-XL-WHT', name: 'XL - White', size: 'XL', color: 'White', price: 649, stock: 20 },
    { sku: 'VNK-M-BLU', name: 'Medium - Sky Blue', size: 'M', color: 'Sky Blue', price: 599, stock: 30 },
    { sku: 'VNK-L-BLU', name: 'Large - Sky Blue', size: 'L', color: 'Sky Blue', price: 599, stock: 25 },
  ]
  for (const v of vneckVariants) {
    await prisma.productVariant.upsert({
      where: { sku: v.sku },
      update: {},
      create: {
        productId: vneck.id,
        sku: v.sku,
        name: v.name,
        price: new Prisma.Decimal(v.price),
        stock: v.stock,
        attributes: { size: v.size, color: v.color },
      },
    })
  }

  // Striped T-Shirt variants
  const stripedVariants = [
    { sku: 'STP-S-NWH', name: 'Small - Navy/White', size: 'S', color: 'Navy/White', price: 649, stock: 25 },
    { sku: 'STP-M-NWH', name: 'Medium - Navy/White', size: 'M', color: 'Navy/White', price: 649, stock: 40 },
    { sku: 'STP-L-NWH', name: 'Large - Navy/White', size: 'L', color: 'Navy/White', price: 649, stock: 35 },
    { sku: 'STP-XL-NWH', name: 'XL - Navy/White', size: 'XL', color: 'Navy/White', price: 699, stock: 20 },
    { sku: 'STP-M-RWH', name: 'Medium - Red/White', size: 'M', color: 'Red/White', price: 649, stock: 30 },
    { sku: 'STP-L-RWH', name: 'Large - Red/White', size: 'L', color: 'Red/White', price: 649, stock: 25 },
  ]
  for (const v of stripedVariants) {
    await prisma.productVariant.upsert({
      where: { sku: v.sku },
      update: {},
      create: {
        productId: stripedTshirt.id,
        sku: v.sku,
        name: v.name,
        price: new Prisma.Decimal(v.price),
        stock: v.stock,
        attributes: { size: v.size, color: v.color },
      },
    })
  }

  // =============================
  // PRODUCT IMAGES (placeholder URLs)
  // =============================

  const productImages = [
    { productId: classicBlack.id, url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600', altText: 'Classic Black T-Shirt Front', isPrimary: true, sortOrder: 0 },
    { productId: classicBlack.id, url: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=600', altText: 'Classic Black T-Shirt Back', isPrimary: false, sortOrder: 1 },
    { productId: graphicPrint.id, url: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=600', altText: 'Graphic Print T-Shirt Front', isPrimary: true, sortOrder: 0 },
    { productId: graphicPrint.id, url: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=600', altText: 'Graphic Print T-Shirt Detail', isPrimary: false, sortOrder: 1 },
    { productId: poloTshirt.id, url: 'https://images.unsplash.com/photo-1625910513413-5fc08ef34e4d?w=600', altText: 'Premium Polo T-Shirt Front', isPrimary: true, sortOrder: 0 },
    { productId: poloTshirt.id, url: 'https://images.unsplash.com/photo-1586790170083-2f9ceadc732d?w=600', altText: 'Premium Polo T-Shirt Side', isPrimary: false, sortOrder: 1 },
    { productId: oversized.id, url: 'https://images.unsplash.com/photo-1618354691438-25bc04584c23?w=600', altText: 'Oversized Drop Shoulder Front', isPrimary: true, sortOrder: 0 },
    { productId: oversized.id, url: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=600', altText: 'Oversized Drop Shoulder Style', isPrimary: false, sortOrder: 1 },
    { productId: vneck.id, url: 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=600', altText: 'V-Neck Slim Fit Front', isPrimary: true, sortOrder: 0 },
    { productId: stripedTshirt.id, url: 'https://images.unsplash.com/photo-1627225924765-552d49cf2b5d?w=600', altText: 'Striped Crew Neck Front', isPrimary: true, sortOrder: 0 },
  ]

  for (const img of productImages) {
    await prisma.productImage.create({ data: img })
  }

  // =============================
  // COUPONS
  // =============================

  await prisma.coupon.upsert({
    where: { code: 'WELCOME10' },
    update: {},
    create: {
      code: 'WELCOME10',
      description: '10% off your first order',
      type: 'PERCENTAGE',
      value: 10,
      minOrder: 50,
      maxDiscount: 100,
      isActive: true,
    },
  })

  await prisma.coupon.upsert({
    where: { code: 'SAVE20' },
    update: {},
    create: {
      code: 'SAVE20',
      description: '$20 off orders above $200',
      type: 'FIXED',
      value: 20,
      minOrder: 200,
      isActive: true,
    },
  })

  console.log('✅ Seed complete!')

  console.log('\nTest credentials:')
  console.log('Admin    → admin@shophub.com / Admin@123')
  console.log('Seller   → seller@shophub.com / Seller@123')
  console.log('Customer → customer@shophub.com / Customer@123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })