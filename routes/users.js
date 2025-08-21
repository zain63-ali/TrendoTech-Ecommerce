const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { isAuthenticated, redirectBasedOnRole } = require('../middleware/auth');

// Setup nodemailer transporter
let transporter;
if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    // Gmail SMTP
    transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });
    transporter.verify((error) => {
        if (error) {
            console.error('Nodemailer transporter verification failed:', error.message);
        } else {
            console.log('Nodemailer transporter is ready to send emails');
        }
    });
} else {
    // Fallback: log emails to console in development when credentials are missing
    transporter = nodemailer.createTransport({ jsonTransport: true });
    console.warn('EMAIL_USER/EMAIL_PASS not set. Emails will be output to console instead of being sent.');
}

// Display signup form
router.get('/signup', redirectBasedOnRole, (req, res) => {
    res.render('users/signup', {
        title: 'Create an Account',
        formError: req.query.error || null
    });
});

// Process signup form
router.post('/signup', async (req, res) => {
    try {
        const { name, email, password, confirmPassword, role } = req.body;
        
        // Validation
        if (!name || !email || !password || !confirmPassword) {
            return res.redirect('/users/signup?error=All fields are required');
        }
        
        if (password !== confirmPassword) {
            return res.redirect('/users/signup?error=Passwords do not match');
        }
        
        if (password.length < 6) {
            return res.redirect('/users/signup?error=Password must be at least 6 characters');
        }
        
        // Validate role (only allow user or seller through form)
        const validRole = role === 'seller' ? 'seller' : 'user';
        
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.redirect('/users/signup?error=Email already in use');
        }
        
        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        // Create email verification token
        const emailVerificationToken = crypto.randomBytes(32).toString('hex');

        // Create new user (unverified)
        const newUser = new User({
            name,
            email,
            password: hashedPassword,
            role: validRole,
            isEmailVerified: false,
            emailVerificationToken
        });
        
        await newUser.save();

        // Send verification email
        const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
        const verifyUrl = `${baseUrl}/verify-email?token=${emailVerificationToken}&email=${encodeURIComponent(email)}`;
        console.log('Email verification link:', verifyUrl);

        await transporter.sendMail({
            from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
            to: email,
            subject: 'Verify your email address',
            html: `
                <p>Hi ${name},</p>
                <p>Thanks for signing up. Please verify your email address by clicking the link below:</p>
                <p><a href="${verifyUrl}" style="color:blue; text-decoration:underline;">Verify Email</a></p>
                <p>If you did not create an account, you can ignore this email.</p>
            `
        });

        return res.redirect('/users/login?message=Account created. Please check your email to verify your account.');
        
    } catch (err) {
        console.error('Signup error:', err);
        res.redirect('/users/signup?error=Server error, please try again');
    }
});

// Display login form
router.get('/login', redirectBasedOnRole, (req, res) => {
    res.render('users/login', {
        title: 'Login to Your Account',
        formError: req.query.error || null
    });
});

// Process login form
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Validation
        if (!email || !password) {
            return res.redirect('/users/login?error=Email and password are required');
        }
        
        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.redirect('/users/login?error=Invalid email or password');
        }
        
        // Block login if not verified (treat undefined as verified for backward compatibility)
        if (user.isEmailVerified === false) {
            return res.redirect('/users/login?error=Please verify your email before logging in');
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.redirect('/users/login?error=Invalid email or password');
        }
        
        // Create session
        req.session.user = {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role
        };
        
        // Redirect based on role
        switch (user.role) {
            case 'admin':
                return res.redirect('/admin/dashboard');
            case 'seller':
                return res.redirect('/seller/dashboard');
            default:
                return res.redirect('/');
        }
        
    } catch (err) {
        console.error('Login error:', err);
        res.redirect('/users/login?error=Server error, please try again');
    }
});

// User Profile Page
router.get('/profile', isAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id).select('-password');
        
        if (!user) {
            req.session.destroy();
            return res.redirect('/users/login?error=User not found');
        }
        
        res.render('users/profile', {
            title: 'Your Profile',
            user: user,
            formError: req.query.error || null,
            formSuccess: req.query.success || null
        });
    } catch (err) {
        console.error('Profile error:', err);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Server error, please try again later'
        });
    }
});

// Update Profile
router.post('/profile/update', isAuthenticated, async (req, res) => {
    try {
        const { name, email } = req.body;
        
        // Validation
        if (!name || !email) {
            return res.redirect('/users/profile?error=Name and email are required');
        }
        
        // Check if email is already in use (by another user)
        const existingUser = await User.findOne({ email, _id: { $ne: req.session.user.id } });
        if (existingUser) {
            return res.redirect('/users/profile?error=Email already in use');
        }
        
        // Update user
        const user = await User.findByIdAndUpdate(
            req.session.user.id,
            { name, email },
            { new: true }
        );
        
        // Update session
        req.session.user.name = user.name;
        req.session.user.email = user.email;
        
        res.redirect('/users/profile?success=Profile updated successfully');
    } catch (err) {
        console.error('Profile update error:', err);
        res.redirect('/users/profile?error=Server error, please try again');
    }
});

// Change Password
router.post('/profile/password', isAuthenticated, async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;
        
        // Validation
        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.redirect('/users/profile?error=All password fields are required');
        }
        
        if (newPassword !== confirmPassword) {
            return res.redirect('/users/profile?error=New passwords do not match');
        }
        
        if (newPassword.length < 6) {
            return res.redirect('/users/profile?error=Password must be at least 6 characters');
        }
        
        // Find user
        const user = await User.findById(req.session.user.id);
        
        // Check current password
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.redirect('/users/profile?error=Current password is incorrect');
        }
        
        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        
        // Update password
        user.password = hashedPassword;
        await user.save();
        
        res.redirect('/users/profile?success=Password changed successfully');
    } catch (err) {
        console.error('Password change error:', err);
        res.redirect('/users/profile?error=Server error, please try again');
    }
});

// Logout
router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

module.exports = router; 