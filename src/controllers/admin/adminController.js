const { PrismaClient, Role } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

// USER MANAGEMENT
exports.listUsers = async (req, res) => {
    const users = await prisma.user.findMany({
        where: { academyId: req.user.academyId },
        orderBy: { createdAt: 'desc' }
    });
    res.render('admin/users', { title: 'Manage Users', users });
};

exports.createUser = async (req, res) => {
    const { firstName, lastName, email, password, role } = req.body;
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    try {
        await prisma.user.create({
            data: {
                firstName,
                lastName,
                email,
                password: hashedPassword,
                role: Role[role],
                academyId: req.user.academyId,
                creatorId: req.user.id
            }
        });
        res.redirect('/admin/users');
    } catch (error) {
        console.error(error);
        res.redirect('/admin/users'); // Should render with error
    }
};

exports.showEditUser = async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    res.render('admin/edit-user', { title: 'Edit User', userToEdit: user });
};

exports.updateUser = async (req, res) => {
    const { firstName, lastName, email, role } = req.body;
    await prisma.user.update({
        where: { id: req.params.id },
        data: { firstName, lastName, email, role: Role[role] }
    });
    res.redirect('/admin/users');
};

exports.deleteUser = async (req, res) => {
    await prisma.user.delete({ where: { id: req.params.id } });
    res.redirect('/admin/users');
};

// SUBJECT MANAGEMENT
exports.listSubjects = async (req, res) => {
    const subjects = await prisma.subject.findMany(); // Subjects are global for now
    res.render('admin/subjects', { title: 'Manage Subjects', subjects });
};

exports.createSubject = async (req, res) => {
    const { name, description } = req.body;
    await prisma.subject.create({ data: { name, description } });
    res.redirect('/admin/subjects');
};

exports.showEditSubject = async (req, res) => {
    const subject = await prisma.subject.findUnique({ where: { id: req.params.id } });
    res.render('admin/edit-subject', { title: 'Edit Subject', subject });
};

exports.updateSubject = async (req, res) => {
    const { name, description } = req.body;
    await prisma.subject.update({ where: { id: req.params.id }, data: { name, description } });
    res.redirect('/admin/subjects');
};

exports.deleteSubject = async (req, res) => {
    await prisma.subject.delete({ where: { id: req.params.id } });
    res.redirect('/admin/subjects');
};