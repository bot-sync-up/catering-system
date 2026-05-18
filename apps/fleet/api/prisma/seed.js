import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminPass = await bcrypt.hash('admin1234', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@fleet.local' },
    update: {},
    create: { email: 'admin@fleet.local', name: 'מנהל מערכת', role: 'ADMIN', password: adminPass },
  });

  const driverPass = await bcrypt.hash('driver1234', 10);
  const driverUser = await prisma.user.upsert({
    where: { email: 'driver@fleet.local' },
    update: {},
    create: { email: 'driver@fleet.local', name: 'דוד הנהג', role: 'DRIVER', password: driverPass, phone: '050-1234567' },
  });

  const driver = await prisma.driver.upsert({
    where: { userId: driverUser.id },
    update: {},
    create: { userId: driverUser.id, name: 'דוד הנהג', phone: '050-1234567', licenseNumber: '12345678' },
  });

  const vehicle = await prisma.vehicle.upsert({
    where: { plate: '123-45-678' },
    update: {},
    create: {
      plate: '123-45-678',
      make: 'טויוטה',
      model: 'קורולה',
      year: 2022,
      fuel: 'HYBRID',
      color: 'לבן',
      currentKm: 24500,
      driverId: driver.id,
    },
  });

  const in40 = new Date(); in40.setDate(in40.getDate() + 40);
  const in80 = new Date(); in80.setDate(in80.getDate() + 80);
  await prisma.vehicleDocument.create({
    data: { vehicleId: vehicle.id, type: 'TEST', expiry: in40, vendor: 'משרד הרישוי' },
  });
  await prisma.vehicleDocument.create({
    data: { vehicleId: vehicle.id, type: 'INSURANCE_MANDATORY', expiry: in80, vendor: 'הראל', amount: 1850 },
  });

  await prisma.vehicleExpense.create({
    data: { vehicleId: vehicle.id, type: 'FUEL', date: new Date(), amount: 320, liters: 42, pricePerLiter: 7.6, mileage: 24500, vendor: 'פז' },
  });

  await prisma.mileage.create({
    data: {
      vehicleId: vehicle.id, driverId: driver.id, date: new Date(),
      startKm: 24400, endKm: 24500, km: 100,
      purpose: 'BUSINESS', origin: 'תל אביב', destination: 'ירושלים',
    },
  });

  console.log({ admin: admin.email, driver: driverUser.email, vehicle: vehicle.plate });
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
