const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

exports.listAdmins = async (req, res) => {
    const academies = await prisma.academy.findMany({
        include: { admin: true },
        orderBy: { createdAt: 'desc' }
    });
    res.render('developer/admins', { title: 'Manage Academies', academies });
};

exports.createAdmin = async (req, res) => {
    const { academyName, appTitle, firstName, lastName, email, password } = req.body;
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    try {
        await prisma.academy.create({
            data: {
                name: academyName,
                appTitle: appTitle,
                admin: {
                    create: {
                        email,
                        password: hashedPassword,
                        firstName,
                        lastName,
                        role: 'ADMIN'
                    }
                }
            }
        });
        res.redirect('/developer/admins');
    } catch (error) {
        console.error(error);
        res.redirect('/developer/admins'); // Should render with error
    }
};