import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Создаем сид дефолтного пользователя
  const testUsername = 'testuser';
  const existingTest = await prisma.user.findUnique({
    where: { username: testUsername },
  });

  if (!existingTest) {
    const hashedPassword = await bcrypt.hash('password123', 10);

    await prisma.user.create({
      data: {
        username: testUsername,
        passwordHash: hashedPassword,
        role: 'SURVIVOR',
      },
    });

    console.log('Дефолтный пользователь создан');
  } else {
    console.log('Дефолтный пользователь уже существует');
  }

  // Админ - админыч
  const adminUsername = 'admin';
  const existingAdmin = await prisma.user.findUnique({
    where: { username: adminUsername },
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('admin123', 10);

    await prisma.user.create({
      data: {
        username: adminUsername,
        passwordHash: hashedPassword,
        role: 'ADMIN',
      },
    });

    console.log('Админ создан');
  } else {
    console.log('Админ уже ранее создан');
  }

  // Никитос
  const nikitaUsername = 'Никита';
  const existingNikita = await prisma.user.findUnique({
    where: { username: nikitaUsername },
  });

  if (!existingNikita) {
    const hashedPassword = await bcrypt.hash('nikita123', 10);

    await prisma.user.create({
      data: {
        username: nikitaUsername,
        passwordHash: hashedPassword,
        role: 'NIKITA',
      },
    });

    console.log('Никитос создан');
  } else {
    console.log('Никитос уже ранее создан');
  }

  console.log('Заполнение сидами успешно выполнено');
}

main()
  .catch((e) => {
    console.error('Ошибка при заполнении сидами:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
