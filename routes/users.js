// User routes - User authentication aur management ke liye routes
const express = require('express'); // Express framework
const router = express.Router(); // Router create karo
const User = require('../models/User'); // User model
const Cart = require('../models/Cart'); // Cart model
const bcrypt = require('bcryptjs'); // Password hashing ke liye
const crypto = require('crypto'); // Token generation ke liye
const nodemailer = require('nodemailer'); // Email sending ke liye
const { isAuthenticated, redirectBasedOnRole } = require('../middleware/auth'); // Authentication middleware

// Nodemailer transporter setup - email bhejne ke liye
let transporter;
if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    // Gmail SMTP configuration
    transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER, // Gmail username
            pass: process.env.EMAIL_PASS // Gmail password
        }
    });
    // Transporter verify karo
    transporter.verify((error) => {
        if (error) {
            console.error('Nodemailer transporter verification failed:', error.message);
        } else {
            console.log('Nodemailer transporter is ready to send emails');
        }
    });
} else {
    // Fallback: development mein console par emails log karo
    transporter = nodemailer.createTransport({ jsonTransport: true });
    console.warn('EMAIL_USER/EMAIL_PASS not set. Emails will be output to console instead of being sent.');
}

// Helper function - session cart ko database cart mein migrate karne ke liye
async function migrateSessionCartToDatabase(userId, sessionCart) {
    try {
        // Agar session cart empty hai ya exist nahi karta to kuch nahi karo
        if (!sessionCart || sessionCart.length === 0) {
            return;
        }

        // User ka database cart dhundo ya naya banao
        let cart = await Cart.findOne({ user: userId });
        if (!cart) {
            cart = new Cart({ user: userId, items: [] }); // Naya cart banao
        }

        // Session cart ki har item ko database cart mein merge karo
        for (const sessionItem of sessionCart) {
            // Check karo ke yeh product pehle se database cart mein hai ya nahi
            const existingItemIndex = cart.items.findIndex(item => 
                item.product.toString() === sessionItem.product._id.toString()
            );

            if (existingItemIndex > -1) {
                // Product pehle se hai - quantity add karo
                cart.items[existingItemIndex].quantity += sessionItem.quantity;
            } else {
                // Naya product hai - cart mein add karo
                cart.items.push({
                    product: sessionItem.product._id,
                    quantity: sessionItem.quantity
                });
            }
        }

        // Updated cart ko database mein save karo
        await cart.save();
        console.log('Successfully migrated session cart to database');
    } catch (err) {
        console.error('Error migrating session cart to database:', err);
    }
}

// GET - Signup form dikhane ke liye route
router.get('/signup', (req, res) => {
    // Signup form render karo
    res.render('users/signup', {
        title: 'Create an Account',
        formError: req.query.error || null // Error message
    });
});

// POST - Signup form process karne ke liye route
router.post('/signup', async (req, res) => {
    try {
        const { name, email, password, confirmPassword, role } = req.body; // Form data nikalo
        
        // Required fields validation
        if (!name || !email || !password || !confirmPassword) {
            return res.redirect('/users/signup?error=All fields are required');
        }
        
        // Password confirmation check
        if (password !== confirmPassword) {
            return res.redirect('/users/signup?error=Passwords do not match');
        }
        
        // Password length validation
        if (password.length < 6) {
            return res.redirect('/users/signup?error=Password must be at least 6 characters');
        }
        
        // Role validation (sirf user ya seller allow hai)
        const validRole = role === 'seller' ? 'seller' : 'user';
        
        // Check karo ke user pehle se exist karta hai ya nahi
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.redirect('/users/signup?error=Email already in use');
        }
        
        // Password hash karo security ke liye
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        // Email verification token create karo
        const emailVerificationToken = crypto.randomBytes(32).toString('hex');

        // Naya user create karo (unverified)
        const newUser = new User({
            name,
            email,
            password: hashedPassword,
            role: validRole,
            isEmailVerified: false, // Email verification pending
            emailVerificationToken
        });
        
        await newUser.save(); // Database mein save karo

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
        formError: req.query.error || null,
        formSuccess: req.query.success || null
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
        
        // User ka session banao - login information store karo
        req.session.user = {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role
        };
        
        // Agar user ke session mein cart items hain to unhe database mein migrate karo
        if (req.session.cart && req.session.cart.length > 0) {
            await migrateSessionCartToDatabase(user._id, req.session.cart);
            // Migration ke baad session cart clear kar do
            req.session.cart = [];
        }
        
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

// Display forgot password form
router.get('/forgot', redirectBasedOnRole, (req, res) => {
    res.render('users/forgot-password', {
        title: 'Forgot Password',
        formError: req.query.error || null,
        formSuccess: req.query.success || null
    });
});

// Process forgot password form
router.post('/forgot', async (req, res) => {
    try {
        const { email } = req.body;
        
        // Validation
        if (!email) {
            return res.redirect('/users/forgot?error=Email is required');
        }
        
        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            // Don't reveal if email exists or not for security
            return res.redirect('/users/forgot?success=If an account with that email exists, we have sent a password reset link');
        }
        
        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        
        // Set token and expiry (1 hour from now)
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
        await user.save();
        
        // Send reset email
        const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
        const resetUrl = `${baseUrl}/users/reset/${resetToken}`;
        
        await transporter.sendMail({
            from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
            to: email,
            subject: 'Password Reset Request',
            html: `
                <p>Hi ${user.name},</p>
                <p>You requested a password reset for your account. Click the link below to reset your password:</p>
                <p><a href="${resetUrl}" style="color:blue; text-decoration:underline;">Reset Password</a></p>
                <p>This link will expire in 1 hour.</p>
                <p>If you did not request this password reset, you can ignore this email.</p>
            `
        });
        
        res.redirect('/users/forgot?success=If an account with that email exists, we have sent a password reset link');
        
    } catch (err) {
        console.error('Forgot password error:', err);
        res.redirect('/users/forgot?error=Server error, please try again');
    }
});

// Display reset password form
router.get('/reset/:token', async (req, res) => {
    try {
        const { token } = req.params;
        
        // Find user with valid reset token
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });
        
        if (!user) {
            return res.render('users/reset-password', {
                title: 'Reset Password',
                formError: 'Invalid or expired reset token',
                validToken: false
            });
        }
        
        res.render('users/reset-password', {
            title: 'Reset Password',
            token: token,
            validToken: true,
            formError: req.query.error || null
        });
        
    } catch (err) {
        console.error('Reset password GET error:', err);
        res.render('users/reset-password', {
            title: 'Reset Password',
            formError: 'Server error, please try again',
            validToken: false
        });
    }
});

// Process reset password form
router.post('/reset/:token', async (req, res) => {
    try {
        const { token } = req.params;
        const { password, confirmPassword } = req.body;
        
        // Validation
        if (!password || !confirmPassword) {
            return res.redirect(`/users/reset/${token}?error=All fields are required`);
        }
        
        if (password !== confirmPassword) {
            return res.redirect(`/users/reset/${token}?error=Passwords do not match`);
        }
        
        if (password.length < 6) {
            return res.redirect(`/users/reset/${token}?error=Password must be at least 6 characters`);
        }
        
        // Find user with valid reset token
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });
        
        if (!user) {
            return res.render('users/reset-password', {
                title: 'Reset Password',
                formError: 'Invalid or expired reset token',
                validToken: false
            });
        }
        
        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        // Update password and clear reset fields
        user.password = hashedPassword;
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;
        await user.save();
        
        res.redirect('/users/login?success=Password reset successful. You can now log in with your new password');
        
    } catch (err) {
        console.error('Reset password POST error:', err);
        res.redirect(`/users/reset/${req.params.token}?error=Server error, please try again`);
    }
});

// Logout
router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

module.exports = router;