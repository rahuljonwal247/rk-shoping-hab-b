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
  // PRODUCTS
  // =============================

  const iphone = await prisma.product.upsert({
    where: { slug: 'iphone-15-pro-max' },
    update: {},
    create: {
      sellerId: sellerProfile.id,
      categoryId: phones.id,
      name: 'iPhone 15 Pro Max',
      slug: 'iphone-15-pro-max',
      description:
        'The latest iPhone with A17 Pro chip, titanium design and pro camera system.',
      basePrice: new Prisma.Decimal(1199.99),
      comparePrice: new Prisma.Decimal(1299.99),
      isPublished: true,
      isApproved: true,
      isFeatured: true,
      tags: ['apple', 'iphone', 'smartphone'],
      avgRating: 4.8,
      totalReviews: 1240,
      totalSold: 3200,
    },
  })

  const macbook = await prisma.product.upsert({
    where: { slug: 'macbook-pro-14-m3' },
    update: {},
    create: {
      sellerId: sellerProfile.id,
      categoryId: laptops.id,
      name: 'MacBook Pro 14" M3',
      slug: 'macbook-pro-14-m3',
      description:
        'Supercharged by the M3 chip. Incredible performance and battery life.',
      basePrice: new Prisma.Decimal(1599.99),
      comparePrice: new Prisma.Decimal(1799.99),
      isPublished: true,
      isApproved: true,
      isFeatured: true,
      tags: ['apple', 'macbook', 'laptop'],
      avgRating: 4.9,
      totalReviews: 856,
      totalSold: 1500,
    },
  })

  // =============================
  // PRODUCT VARIANTS
  // =============================

  await prisma.productVariant.upsert({
    where: { sku: 'IP15PM-256-BLK' },
    update: {},
    create: {
      productId: iphone.id,
      sku: 'IP15PM-256-BLK',
      name: '256GB Black Titanium',
      price: new Prisma.Decimal(1199.99),
      stock: 50,
      attributes: {
        storage: '256GB',
        color: 'Black Titanium',
      },
    },
  })

  await prisma.productVariant.upsert({
    where: { sku: 'IP15PM-512-WHT' },
    update: {},
    create: {
      productId: iphone.id,
      sku: 'IP15PM-512-WHT',
      name: '512GB White Titanium',
      price: new Prisma.Decimal(1399.99),
      stock: 30,
      attributes: {
        storage: '512GB',
        color: 'White Titanium',
      },
    },
  })

  await prisma.productVariant.upsert({
    where: { sku: 'MBP14-M3-8-512' },
    update: {},
    create: {
      productId: macbook.id,
      sku: 'MBP14-M3-8-512',
      name: '8GB RAM / 512GB SSD',
      price: new Prisma.Decimal(1599.99),
      stock: 25,
      attributes: {
        ram: '8GB',
        storage: '512GB',
      },
    },
  })

  await prisma.productVariant.upsert({
    where: { sku: 'MBP14-M3-16-1TB' },
    update: {},
    create: {
      productId: macbook.id,
      sku: 'MBP14-M3-16-1TB',
      name: '16GB RAM / 1TB SSD',
      price: new Prisma.Decimal(1999.99),
      stock: 15,
      attributes: {
        ram: '16GB',
        storage: '1TB',
      },
    },
  })

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