// Authentication Middleware - User authentication aur authorization ke liye

// User login check karne ke liye middleware
exports.isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return next(); // Agar user login hai to next middleware par jao
    }
    // Agar login nahi hai to login page par redirect karo
    return res.redirect('/users/login?error=Please log in to access this page');
};

// Seller access check karne ke liye middleware
exports.isSeller = (req, res, next) => {
    // User login hai aur seller ya admin role hai to access allow karo
    if (req.session.user && (req.session.user.role === 'seller' || req.session.user.role === 'admin')) {
        return next(); // Access granted
    }
    // Warna 403 error page dikhao
    return res.status(403).render('error', {
        title: 'Access Denied',
        message: 'You do not have permission to access this page. Seller access required.'
    });
};

// Admin access check karne ke liye middleware
exports.isAdmin = (req, res, next) => {
    // User login hai aur admin role hai to access allow karo
    if (req.session.user && req.session.user.role === 'admin') {
        return next(); // Access granted
    }
    // Warna 403 error page dikhao
    return res.status(403).render('error', {
        title: 'Access Denied',
        message: 'You do not have permission to access this page. Admin access required.'
    });
};

// User role ke base par redirect karne ke liye middleware
exports.redirectBasedOnRole = (req, res, next) => {
    if (!req.session.user) {
        return next(); // Agar user login nahi hai to next middleware par jao
    }
    
    // User ke role ke according redirect karo
    switch (req.session.user.role) {
        case 'admin':
            return res.redirect('/admin/dashboard'); // Admin dashboard
        case 'seller':
            return res.redirect('/seller/dashboard'); // Seller dashboard
        default:
            return res.redirect('/users/profile'); // Customer profile
    }
};