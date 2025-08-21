const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Product = require('../models/Product');
const Blog = require('../models/Blog');
const Order = require('../models/Order');
const Feedback = require('../models/Feedback');
const { isAdmin } = require('../middleware/auth');

// Apply admin middleware to all routes in this router
router.use(isAdmin);

// Admin Dashboard
router.get('/dashboard', async (req, res) => {
    try {
        // Get counts for dashboard
        const userCount = await User.countDocuments();
        const productCount = await Product.countDocuments();
        const sellerCount = await User.countDocuments({ role: 'seller' });
        const blogCount = await Blog.countDocuments();
        const orderCount = await Order.countDocuments();
        const feedbackCount = await Feedback.countDocuments();
        
        res.render('admin/dashboard', {
            title: 'Admin Dashboard',
            userCount,
            productCount,
            sellerCount,
            blogCount,
            orderCount,
            feedbackCount
        });
    } catch (err) {
        console.error('Admin dashboard error:', err);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Server error, please try again later'
        });
    }
});

// Manage Orders
router.get('/orders', async (req, res) => {
    try {
        // Get all orders sorted by newest first
        const orders = await Order.find()
            .sort({ createdAt: -1 })
            .populate('user', 'name email');
        
        res.render('admin/orders', {
            title: 'Manage Orders',
            orders
        });
    } catch (err) {
        console.error('Admin orders error:', err);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Server error, please try again later'
        });
    }
});

// View Order Details
router.get('/orders/:id', async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('user', 'name email');
        
        if (!order) {
            return res.status(404).render('error', {
                title: 'Not Found',
                message: 'Order not found'
            });
        }
        
        res.render('admin/order-details', {
            title: `Order #${order.orderNumber}`,
            order
        });
    } catch (err) {
        console.error('Admin order details error:', err);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Server error, please try again later'
        });
    }
});

// Update Order Status
router.post('/orders/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        
        // Validate status
        if (!['pending', 'processing', 'shipped', 'delivered', 'cancelled'].includes(status)) {
            return res.redirect(`/admin/orders/${req.params.id}?error=Invalid status`);
        }
        
        // Find the order first to check current status
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.redirect('/admin/orders?error=Order not found');
        }
        
        // Prevent updating status of cancelled orders (customer-initiated cancellations should be final)
        if (order.status === 'cancelled') {
            return res.redirect(`/admin/orders/${req.params.id}?error=Cannot update status of cancelled orders. Customer cancellations are final.`);
        }
        
        await Order.findByIdAndUpdate(req.params.id, { status });
        
        // Log the status change for audit purposes
        console.log(`Admin updated order ${order.orderNumber} status from ${order.status} to ${status}`);
        
        res.redirect(`/admin/orders/${req.params.id}?success=Order status updated to ${status}`);
    } catch (err) {
        console.error('Update order status error:', err);
        res.redirect(`/admin/orders/${req.params.id}?error=Server error, please try again`);
    }
});

// Handle Payment Approval/Rejection
router.post('/orders/:id/payment-action', async (req, res) => {
    try {
        const { action, adminNotes } = req.body;
        const orderId = req.params.id;
        
        // Validate action
        if (!['approve', 'reject'].includes(action)) {
            return res.redirect(`/admin/orders/${orderId}?error=Invalid payment action`);
        }
        
        const order = await Order.findById(orderId);
        if (!order) {
            return res.redirect('/admin/orders?error=Order not found');
        }
        
        // Check if order has payment method that requires approval
        if (!['jazzcash', 'bank_transfer'].includes(order.paymentMethod)) {
            return res.redirect(`/admin/orders/${orderId}?error=This order does not require payment approval`);
        }
        
        // Update payment status
        const paymentStatus = action === 'approve' ? 'approved' : 'rejected';
        const updateData = {
            'paymentDetails.paymentStatus': paymentStatus
        };
        
        if (adminNotes) {
            updateData['paymentDetails.adminNotes'] = adminNotes;
        }
        
        // If payment is approved, also update order status to processing
        if (action === 'approve') {
            updateData.status = 'processing';
            updateData['paymentDetails.approvedBy'] = req.session.user.id;
            updateData['paymentDetails.approvedAt'] = new Date();
        }
        
        await Order.findByIdAndUpdate(orderId, updateData);
        
        const successMessage = action === 'approve' 
            ? 'Payment approved successfully. Order status updated to Processing.'
            : 'Payment rejected successfully.';
            
        res.redirect(`/admin/orders/${orderId}?success=${successMessage}`);
    } catch (err) {
        console.error('Payment action error:', err);
        res.redirect(`/admin/orders/${req.params.id}?error=Server error, please try again`);
    }
});

// Manage Users
router.get('/users', async (req, res) => {
    try {
        const { filter } = req.query;
        let query = {};
        
        // Filter users but exclude admin users from being displayed
        if (filter === 'seller') {
            query.role = 'seller';
        } else if (filter === 'user') {
            query.role = 'user';
        } else {
            // Show all users except admins
            query.role = { $ne: 'admin' };
        }
        
        const users = await User.find(query).select('-password').sort({ createdAt: -1 });
        
        res.render('admin/users', {
            title: 'Manage Users',
            users,
            filter,
            formSuccess: req.query.success || null,
            formError: req.query.error || null
        });
    } catch (err) {
        console.error('Admin users error:', err);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Server error, please try again later'
        });
    }
});

// Change User Role
router.post('/users/role', async (req, res) => {
    try {
        const { userId, role } = req.body;
        
        // Validate role - admin role cannot be assigned through this interface
        if (!['user', 'seller'].includes(role)) {
            return res.redirect('/admin/users?error=Invalid role');
        }
        
        // Prevent changing admin users' roles
        const user = await User.findById(userId);
        if (!user) {
            return res.redirect('/admin/users?error=User not found');
        }
        
        if (user.role === 'admin') {
            return res.redirect('/admin/users?error=Cannot modify admin user roles');
        }
        
        await User.findByIdAndUpdate(userId, { role });
        
        res.redirect('/admin/users?success=User role updated successfully');
    } catch (err) {
        console.error('Change role error:', err);
        res.redirect('/admin/users?error=Server error, please try again');
    }
});

// Manage Products
router.get('/products', async (req, res) => {
    try {
        const { filter } = req.query;
        let query = {};
        
        // Apply category filter if provided
        if (filter && filter !== 'all') {
            query.category = filter;
        }
        
        const products = await Product.find(query).populate('seller', 'name').sort({ createdAt: -1 });
        
        res.render('admin/products', {
            title: 'Manage Products',
            products,
            filter,
            formSuccess: req.query.success || null,
            formError: req.query.error || null
        });
    } catch (err) {
        console.error('Admin products error:', err);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Server error, please try again later'
        });
    }
});

// Delete Product (Admin)
router.post('/products/delete/:id', async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        
        res.redirect('/admin/products?success=Product deleted successfully');
    } catch (err) {
        console.error('Delete product error:', err);
        res.redirect('/admin/products?error=Server error, please try again');
    }
});

// Toggle Featured Status
router.post('/products/featured/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        
        if (!product) {
            return res.redirect('/admin/products?error=Product not found');
        }
        
        product.featured = !product.featured;
        await product.save();
        
        res.redirect('/admin/products?success=Product featured status updated');
    } catch (err) {
        console.error('Toggle featured error:', err);
        res.redirect('/admin/products?error=Server error, please try again');
    }
});

// GET Edit Product Page
router.get('/products/edit/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).send("Product not found");
        }
        res.render('admin/edit-product', { product });
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
});

// Post Update Product Page
router.post('/products/edit/:id', async (req, res) => {
    try {
        const { name, description, price, category } = req.body;

        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).render('error', {
                title: 'Not Found',
                message: 'Product not found'
            });
        }

        product.name = name;
        product.description = description;
        product.price = price;
        product.category = category;

        await product.save();

        res.redirect('/admin/products?success=Product updated successfully');
    } catch (err) {
        console.error('Product update error:', err);
        res.redirect(`/admin/products/edit/${req.params.id}?error=Server error`);
    }
});


// Manage Blogs
router.get('/blogs', async (req, res) => {
    try {
        const blogs = await Blog.find()
            .populate('author', 'name')
            .sort({ createdAt: -1 });
        
        res.render('admin/blogs', {
            title: 'Manage Blogs',
            blogs,
            formSuccess: req.query.success || null,
            formError: req.query.error || null
        });
    } catch (err) {
        console.error('Admin blogs error:', err);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Server error, please try again later'
        });
    }
});

// Delete Blog
router.post('/blogs/delete/:id', async (req, res) => {
    try {
        await Blog.findByIdAndDelete(req.params.id);
        
        res.redirect('/admin/blogs?success=Blog post deleted successfully');
    } catch (err) {
        console.error('Delete blog error:', err);
        res.redirect('/admin/blogs?error=Server error, please try again');
    }
});

// Toggle Blog Publish Status
router.post('/blogs/toggle-publish/:id', async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id);
        
        if (!blog) {
            return res.redirect('/admin/blogs?error=Blog not found');
        }
        
        blog.isPublished = !blog.isPublished;
        await blog.save();
        
        res.redirect('/admin/blogs?success=Blog publish status updated');
    } catch (err) {
        console.error('Toggle blog publish error:', err);
        res.redirect('/admin/blogs?error=Server error, please try again');
    }
});

// Script to create an admin user if it doesn't exist
const createAdminUser = async () => {
    try {
        // Check if admin exists
        const adminExists = await User.findOne({ role: 'admin' });
        
        if (!adminExists) {
            const bcrypt = require('bcryptjs');
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('admin123', salt);
            
            const adminUser = new User({
                name: 'Admin User',
                email: 'admin@example.com',
                password: hashedPassword,
                role: 'admin'
            });
            
            await adminUser.save();
            console.log('Admin user created successfully. Email: admin@example.com, Password: admin123');
        }
    } catch (err) {
        console.error('Create admin error:', err);
    }
};

// GET: Add New Product Page
router.get('/products/add', (req, res) => {
    res.render('admin/add-product', {
        title: 'Add New Product'
    });
});

// POST: Handle Add New Product
router.post('/products/add', async (req, res) => {
    try {
        const { name, description, price, category } = req.body;

        const newProduct = new Product({
            name,
            description,
            price,
            category,
            featured: false // by default
        });

        await newProduct.save();
        res.redirect('/admin/products?success=Product added successfully');
    } catch (err) {
        console.error('Add product error:', err);
        res.redirect('/admin/products?error=Server error while adding product');
    }
});

// GET: Add New User Page
router.get('/users/add', (req, res) => {
    res.render('admin/add-user', {
        title: 'Add New User',
        formSuccess: req.query.success || null,
        formError: req.query.error || null
    });
});

// POST: Handle Add New User
router.post('/users/add', async (req, res) => {
    try {
        const { name, email, password, confirmPassword, role, phone, address } = req.body;
        
        // Validate required fields
        if (!name || !email || !password || !role) {
            return res.redirect('/admin/users/add?error=Please fill in all required fields');
        }
        
        // Validate role - only allow user and seller roles
        if (!['user', 'seller'].includes(role)) {
            return res.redirect('/admin/users/add?error=Invalid role selected');
        }
        
        // Check password confirmation
        if (password !== confirmPassword) {
            return res.redirect('/admin/users/add?error=Passwords do not match');
        }
        
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.redirect('/admin/users/add?error=User with this email already exists');
        }
        
        // Hash password
        const bcrypt = require('bcryptjs');
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        // Create new user
        const newUser = new User({
            name,
            email,
            password: hashedPassword,
            role,
            phone: phone || undefined,
            address: address || undefined
        });
        
        await newUser.save();
        
        res.redirect('/admin/users?success=User added successfully');
    } catch (err) {
        console.error('Add user error:', err);
        res.redirect('/admin/users/add?error=Server error while adding user');
    }
});

// Manage Feedbacks
router.get('/feedbacks', async (req, res) => {
    try {
        const feedbacks = await Feedback.find()
            .populate('user', 'name email')
            .populate('product', 'name')
            .sort({ createdAt: -1 });
        
        res.render('admin/feedbacks', {
            title: 'Manage Feedbacks',
            feedbacks
        });
    } catch (err) {
        console.error('Admin feedbacks error:', err);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Server error, please try again later'
        });
    }
});

// Delete Feedback
router.delete('/feedbacks/:id', async (req, res) => {
    try {
        const feedbackId = req.params.id;
        
        const feedback = await Feedback.findById(feedbackId);
        if (!feedback) {
            return res.status(404).json({ success: false, message: 'Feedback not found' });
        }
        
        await Feedback.findByIdAndDelete(feedbackId);
        
        res.json({ success: true, message: 'Feedback deleted successfully' });
    } catch (err) {
        console.error('Delete feedback error:', err);
        res.status(500).json({ success: false, message: 'Server error while deleting feedback' });
    }
});

// Expose the creator to be run after DB connects
router.createAdminUser = createAdminUser;

module.exports = router;