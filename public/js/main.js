// Document ready function - jab page load ho jaye to yeh code chalega
$(document).ready(function() {
    // Back to Top Button functionality - page ke top par jane ke liye button
    const backToTopBtn = $('.back-to-top');
    
    // Scroll position ke base par button show/hide karo
    $(window).scroll(function() {
        if ($(this).scrollTop() > 300) {
            backToTopBtn.addClass('show'); // 300px scroll ke baad button show karo
        } else {
            backToTopBtn.removeClass('show'); // Upar aane par button hide karo
        }
    });
    
    // Button click par smooth scroll to top
    backToTopBtn.on('click', function() {
        $('html, body').animate({
            scrollTop: 0 // Page ke top par jao
        }, 600); // 600ms mein animation complete karo
    });
    
    // Cart page mein quantity increase/decrease buttons ke liye event handler
    $('.quantity-btn').on('click', function() {
        const productId = $(this).data('product-id'); // Product ki ID nikalo
        const action = $(this).data('action'); // Increase ya decrease action
        const input = $(this).closest('.input-group').find('.quantity-input'); // Quantity input field
        let quantity = parseInt(input.val()); // Current quantity
        
        // Action ke base par quantity change karo
        if (action === 'increase') {
            quantity++; // Quantity badhao
        } else if (action === 'decrease' && quantity > 1) {
            quantity--; // Quantity kam karo (minimum 1 rakho)
        }
        
        // Server par quantity update karne ke liye AJAX request bhejo
        $.ajax({
            url: '/cart/update-quantity', // Backend route
            method: 'POST',
            data: { productId, quantity }, // Data bhejo
            success: function(response) {
                if (response.success) {
                    // Frontend mein quantity display update karo
                    input.val(quantity);
                    
                    // Item ka subtotal update karo
                    const row = input.closest('tr');
                    row.find('.item-subtotal').text('Rs. ' + response.itemTotal);
                    
                    // Cart ka total summary update karo
                    updateCartSummary(response.cartTotal);
                }
            }
        });
    });
    
    // Cart se item remove karne ke liye button event handler
    $('.remove-item-btn').on('click', function() {
        const productId = $(this).data('product-id'); // Product ki ID nikalo
        const row = $(this).closest('tr'); // Table row element
        
        // Server par item remove karne ke liye AJAX request bhejo
        $.ajax({
            url: '/cart/remove', // Backend route
            method: 'POST',
            data: { productId }, // Product ID bhejo
            success: function(response) {
                if (response.success) {
                    // Row ko fade out animation ke saath remove karo
                    row.fadeOut(300, function() {
                        $(this).remove(); // DOM se remove karo
                        
                        // Header mein cart count aur totals update karo
                        updateCartCount(response.cartCount);
                        updateCartSummary(response.cartTotal);
                        
                        // Agar cart empty ho gaya to page reload karo empty message dikhane ke liye
                        if (response.cartCount === 0) {
                            location.reload();
                        }
                    });
                }
            }
        });
    });
    
    // Pura cart clear karne ke liye button event handler
    $('#clear-cart').on('click', function() {
        // User se confirmation mango
        if (confirm('Are you sure you want to clear your cart?')) {
            // Server par cart clear karne ke liye AJAX request bhejo
            $.ajax({
                url: '/cart/clear', // Backend route
                method: 'POST',
                success: function(response) {
                    if (response.success) {
                        location.reload(); // Page reload karo empty cart dikhane ke liye
                    }
                }
            });
        }
    });
    
    // Product detail page mein quantity increase/decrease buttons
    $('#increaseQty').on('click', function() {
        const input = $('#quantity'); // Quantity input field
        const currentValue = parseInt(input.val()); // Current value nikalo
        input.val(currentValue + 1); // Value 1 se badhao
    });
    
    $('#decreaseQty').on('click', function() {
        const input = $('#quantity'); // Quantity input field
        const currentValue = parseInt(input.val()); // Current value nikalo
        if (currentValue > 1) {
            input.val(currentValue - 1); // Value 1 se kam karo (minimum 1 rakho)
        }
    });
    
    // Product pages mein "Add to Cart" buttons ke liye event handler
    $('.add-to-cart-btn').on('click', function() {
        const productId = $(this).data('product-id'); // Product ki ID nikalo
        const quantity = $('#quantity-input').val() || 1; // Quantity nikalo (default 1)
        
        // Server par product add karne ke liye AJAX request bhejo
        $.ajax({
            url: '/cart/add', // Backend route
            method: 'POST',
            data: { productId, quantity }, // Data bhejo
            success: function(response) {
                if (response.success) {
                    // Success message dikhao SweetAlert2 se
                    showCartSuccessAlert('Your product has been successfully added to your cart.');
                    
                    // Header mein cart count update karo
                    updateCartCount(response.cartCount);
                }
            },
            error: function() {
                // Error message dikhao
                showCartErrorAlert('Failed to add product to cart.');
            }
        });
    });
    
    // Product detail page mein "Add to Cart" button ke liye event handler
    $('.add-to-cart-detail').on('click', function() {
        const productId = $(this).data('product-id'); // Product ki ID nikalo
        const quantity = $('#quantity').val() || 1; // Quantity nikalo (default 1)
        
        // Server par product add karne ke liye AJAX request bhejo
        $.ajax({
            url: '/cart/add', // Backend route
            method: 'POST',
            data: { productId, quantity }, // Data bhejo
            success: function(response) {
                if (response.success) {
                    // Success message dikhao SweetAlert2 se
                    showCartSuccessAlert('Your product has been successfully added to your cart.');
                    
                    // Header mein cart count update karo
                    updateCartCount(response.cartCount);
                }
            },
            error: function() {
                // Error message dikhao
                showCartErrorAlert('Failed to add product to cart.');
            }
        });
    });
    
    // Toggle wishlist buttons
    $('.toggle-wishlist-btn').on('click', function() {
        const btn = $(this);
        const productId = btn.data('product-id');
        const isInWishlist = btn.hasClass('in-wishlist');
        
        // Check if user is logged in
        const isLoggedIn = Boolean($('body').data('user-id'));
        
        if (!isLoggedIn) {
            // If not logged in, redirect to login page
            window.location.href = '/users/login?returnUrl=' + encodeURIComponent(window.location.pathname);
            return;
        }
        
        if (isInWishlist) {
            // Remove from wishlist
            $.ajax({
                url: '/wishlist/remove/' + productId,
                method: 'DELETE',
                success: function(response) {
                    if (response.success) {
                        // Update button appearance
                        btn.removeClass('in-wishlist');
                        btn.find('i').removeClass('fas text-danger').addClass('far');
                        
                        // Update wishlist count in header
                        updateWishlistCount(response.wishlistCount);
                        
                        // Show success message
                        showAlert('success', 'Product removed from wishlist!');
                    }
                },
                error: function() {
                    showAlert('danger', 'Failed to remove product from wishlist.');
                }
            });
        } else {
            // Add to wishlist
            $.ajax({
                url: '/wishlist/add/' + productId,
                method: 'POST',
                success: function(response) {
                    if (response.success) {
                        // Update button appearance
                        btn.addClass('in-wishlist');
                        btn.find('i').removeClass('far').addClass('fas text-danger');
                        
                        // Update wishlist count in header
                        updateWishlistCount(response.wishlistCount);
                        
                        // Show success message
                        showAlert('success', 'Product added to wishlist!');
                    }
                },
                error: function() {
                    showAlert('danger', 'Failed to add product to wishlist.');
                }
            });
        }
    });
    
    // Checkout button ke liye event handler
    $('#checkout-btn').on('click', function() {
        // Check karo ke user login hai ya nahi
        const isLoggedIn = Boolean($('body').data('user-id'));
        
        if (!isLoggedIn) {
            // Agar login nahi hai to login page par redirect karo
            window.location.href = '/users/login?returnUrl=' + encodeURIComponent('/cart/checkout');
            return;
        }
        
        // Agar login hai to checkout page par jao
        window.location.href = '/cart/checkout';
    });
    
    // Helper functions - yeh functions different jagah use hote hain
    
    // Header mein cart count update karne ke liye function
    function updateCartCount(count) {
        $('.cart-count').text(count); // Cart icon par number update karo
    }
    
    // Header mein wishlist count update karne ke liye function
    function updateWishlistCount(count) {
        $('.wishlist-count').text(count); // Wishlist icon par number update karo
    }
    
    // Cart page mein summary section update karne ke liye function
    function updateCartSummary(total) {
        // Subtotal update karo
        $('#cart-subtotal').text('Rs. ' + total);
        
        // Tax calculate kar ke update karo (10% of subtotal)
        const tax = (parseFloat(total) * 0.1).toFixed(2);
        $('#cart-tax').text('Rs. ' + tax);
        
        // Grand total calculate kar ke update karo (subtotal + tax)
        const grandTotal = (parseFloat(total) * 1.1).toFixed(2);
        $('#cart-total').text('Rs. ' + grandTotal);
    }
    
    // SweetAlert2 success popup - cart operations ke liye
    function showCartSuccessAlert(message = 'Product added to cart!') {
        Swal.fire({
            icon: 'success', // Success icon
            title: 'Product Added!', // Title
            text: message, // Custom message
            showConfirmButton: true,
            confirmButtonText: 'OK',
            confirmButtonColor: '#28a745', // Green color
            allowOutsideClick: false, // Bahar click se close nahi hoga
            allowEscapeKey: false // Escape key se close nahi hoga
        });
    }
    
    // SweetAlert2 error popup - cart operations ke liye
    function showCartErrorAlert(message = 'Something went wrong. Please try again.') {
        Swal.fire({
            icon: 'error', // Error icon
            title: 'Error!', // Title
            text: message, // Custom message
            showConfirmButton: true,
            confirmButtonText: 'OK',
            confirmButtonColor: '#dc3545' // Red color
        });
    }
    
    // Generic SweetAlert2 success popup - general use ke liye
    function showSuccessAlert(message) {
        Swal.fire({
            icon: 'success', // Success icon
            title: 'Success!', // Title
            text: message, // Custom message
            timer: 2000, // 2 seconds baad auto close
            timerProgressBar: true, // Progress bar dikhao
            showConfirmButton: true,
            confirmButtonText: 'OK',
            confirmButtonColor: '#28a745' // Green color
        });
    }
    
    // Generic SweetAlert2 error popup - general use ke liye
    function showErrorAlert(message) {
        Swal.fire({
            icon: 'error', // Error icon
            title: 'Error!', // Title
            text: message, // Custom message
            showConfirmButton: true,
            confirmButtonText: 'OK',
            confirmButtonColor: '#dc3545' // Red color
        });
    }
    
    // Legacy showAlert function - purane code ke liye backward compatibility
    function showAlert(type, message) {
        if (type === 'success') {
            showSuccessAlert(message); // Success alert call karo
        } else if (type === 'danger' || type === 'error') {
            showErrorAlert(message); // Error alert call karo
        } else {
            // Fallback - agar type match nahi karta to success dikhao
            showSuccessAlert(message);
        }
    }
}); // Document ready function ka end
