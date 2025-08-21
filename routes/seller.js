const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { isSeller } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        // Determine the destination folder based on the product category
        const getDestination = (req) => {
            const category = req.body.category;
            let destinationPath = 'public/images/products/';
            
            // Create folders if they don't exist
            if (!fs.existsSync(destinationPath)) {
                fs.mkdirSync(destinationPath, { recursive: true });
            }
            
            // Create category-specific subfolder if needed
            if (category) {
                const categoryPath = path.join(destinationPath, category);
                if (!fs.existsSync(categoryPath)) {
                    fs.mkdirSync(categoryPath, { recursive: true });
                }
                return categoryPath;
            }
            
            return destinationPath;
        };
        
        cb(null, getDestination(req));
    },
    filename: function(req, file, cb) {
        // Generate unique filename with timestamp and original extension
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

// File filter to accept only images
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Not an image! Please upload only images.'), false);
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB max file size
    }
});

// Apply seller middleware to all routes in this router
router.use(isSeller);

// Seller Dashboard
router.get('/dashboard', async (req, res) => {
    try {
        // Get seller's products
        const products = await Product.find({ seller: req.session.user.id }).sort({ createdAt: -1 });
        
        res.render('seller/dashboard', {
            title: 'Seller Dashboard',
            products,
            productCount: products.length
        });
    } catch (err) {
        console.error('Seller dashboard error:', err);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Server error, please try again later'
        });
    }
});

// Add Product Form
router.get('/products/add', (req, res) => {
    const formError = req.query.error || null;
    res.render('seller/add-product', {
        title: 'Add New Product',
        formError
    });
});

// Create Product
router.post('/products', upload.single('productImage'), async (req, res) => {
    try {
        const { name, description, price, category } = req.body;
        
        // Validation
        if (!name || !description || !price || !category) {
            return res.redirect('/seller/products/add?error=All fields are required');
        }
        
        if (!req.file) {
            return res.redirect('/seller/products/add?error=Product image is required');
        }
        
        // Create relative path to the uploaded image
        const imageUrl = '/images/products/' + 
            (category ? category + '/' : '') + 
            req.file.filename;
        
        // Create product
        const newProduct = new Product({
            name,
            description,
            price,
            category,
            imageUrl,
            inStock: req.body.inStock === 'true',
            seller: req.session.user.id
        });
        
        await newProduct.save();
        
        res.redirect('/seller/dashboard?success=Product added successfully');
    } catch (err) {
        console.error('Add product error:', err);
        res.redirect('/seller/products/add?error=' + encodeURIComponent(err.message || 'Server error, please try again'));
    }
});

// Edit Product Form
router.get('/products/edit/:id', async (req, res) => {
    try {
        const product = await Product.findOne({ 
            _id: req.params.id,
            seller: req.session.user.id
        });
        
        if (!product) {
            return res.status(404).render('error', {
                title: 'Product Not Found',
                message: 'The requested product could not be found or you do not have permission to edit it'
            });
        }
        
        res.render('seller/edit-product', {
            title: 'Edit Product',
            product
        });
    } catch (err) {
        console.error('Edit product form error:', err);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Server error, please try again later'
        });
    }
});

// Update Product
router.post('/products/:id', upload.single('productImage'), async (req, res) => {
    try {
        const { name, description, price, category, inStock } = req.body;
        
        // Validation
        if (!name || !description || !price || !category) {
            return res.redirect(`/seller/products/edit/${req.params.id}?error=All fields are required`);
        }
        
        // Find product and verify seller
        const product = await Product.findOne({
            _id: req.params.id,
            seller: req.session.user.id
        });
        
        if (!product) {
            return res.status(404).render('error', {
                title: 'Product Not Found',
                message: 'The requested product could not be found or you do not have permission to edit it'
            });
        }
        
        // Update product
        product.name = name;
        product.description = description;
        product.price = price;
        product.category = category;
        
        // Update image if a new one was uploaded
        if (req.file) {
            // Create relative path to the uploaded image
            product.imageUrl = '/images/products/' + 
                (category ? category + '/' : '') + 
                req.file.filename;
        }
        
        product.inStock = inStock === 'true';
        
        await product.save();
        
        res.redirect('/seller/dashboard?success=Product updated successfully');
    } catch (err) {
        console.error('Update product error:', err);
        res.redirect(`/seller/products/edit/${req.params.id}?error=` + encodeURIComponent(err.message || 'Server error, please try again'));
    }
});

// Delete Product
router.post('/products/delete/:id', async (req, res) => {
    try {
        // Find product and verify seller
        const product = await Product.findOne({
            _id: req.params.id,
            seller: req.session.user.id
        });
        
        if (!product) {
            return res.status(404).render('error', {
                title: 'Product Not Found',
                message: 'The requested product could not be found or you do not have permission to delete it'
            });
        }
        
        await Product.findByIdAndDelete(req.params.id);
        
        res.redirect('/seller/dashboard?success=Product deleted successfully');
    } catch (err) {
        console.error('Delete product error:', err);
        res.redirect('/seller/dashboard?error=Server error, please try again');
    }
});

module.exports = router; 