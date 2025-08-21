$(document).ready(function() {
    // Back to Top Button functionality
    const backToTopBtn = $('.back-to-top');
    
    // Show/hide button based on scroll position
    $(window).scroll(function() {
        if ($(this).scrollTop() > 300) {
            backToTopBtn.addClass('show');
        } else {
            backToTopBtn.removeClass('show');
        }
    });
    
    // Smooth scroll to top when button is clicked
    backToTopBtn.on('click', function() {
        $('html, body').animate({
            scrollTop: 0
        }, 600);
    });
    
    // Cart page quantity buttons
    $('.quantity-btn').on('click', function() {
        const productId = $(this).data('product-id');
        const action = $(this).data('action');
        const input = $(this).closest('.input-group').find('.quantity-input');
        let quantity = parseInt(input.val());
        
        if (action === 'increase') {
            quantity++;
        } else if (action === 'decrease' && quantity > 1) {
            quantity--;
        }
        
        // Update quantity in cart
        $.ajax({
            url: '/cart/update-quantity',
            method: 'POST',
            data: { productId, quantity },
            success: function(response) {
                if (response.success) {
                    // Update the display
                    input.val(quantity);
                    
                    // Update the item subtotal
                    const row = input.closest('tr');
                    row.find('.item-subtotal').text('$' + response.itemTotal);
                    
                    // Update the cart totals
                    updateCartSummary(response.cartTotal);
                }
            }
        });
    });
    
    // Remove item button
    $('.remove-item-btn').on('click', function() {
        const productId = $(this).data('product-id');
        const row = $(this).closest('tr');
        
        $.ajax({
            url: '/cart/remove',
            method: 'POST',
            data: { productId },
            success: function(response) {
                if (response.success) {
                    // Remove the row
                    row.fadeOut(300, function() {
                        $(this).remove();
                        
                        // Update the cart count and totals
                        updateCartCount(response.cartCount);
                        updateCartSummary(response.cartTotal);
                        
                        // If cart is empty, refresh the page to show empty cart message
                        if (response.cartCount === 0) {
                            location.reload();
                        }
                    });
                }
            }
        });
    });
    
    // Clear cart button
    $('#clear-cart').on('click', function() {
        if (confirm('Are you sure you want to clear your cart?')) {
            $.ajax({
                url: '/cart/clear',
                method: 'POST',
                success: function(response) {
                    if (response.success) {
                        location.reload();
                    }
                }
            });
        }
    });
    
    // Quantity buttons on product detail page
    $('#increaseQty').on('click', function() {
        const input = $('#quantity');
        const currentValue = parseInt(input.val());
        input.val(currentValue + 1);
    });
    
    $('#decreaseQty').on('click', function() {
        const input = $('#quantity');
        const currentValue = parseInt(input.val());
        if (currentValue > 1) {
            input.val(currentValue - 1);
        }
    });
    
    // Add to cart buttons on product pages
    $('.add-to-cart-btn').on('click', function() {
        const productId = $(this).data('product-id');
        const quantity = $('#quantity-input').val() || 1;
        
        $.ajax({
            url: '/cart/add',
            method: 'POST',
            data: { productId, quantity },
            success: function(response) {
                if (response.success) {
                    // Show success message with SweetAlert2
                    showCartSuccessAlert('Your product has been successfully added to your cart.');
                    
                    // Update cart count
                    updateCartCount(response.cartCount);
                }
            },
            error: function() {
                showCartErrorAlert('Failed to add product to cart.');
            }
        });
    });
    
    // Add to cart button on product detail page
    $('.add-to-cart-detail').on('click', function() {
        const productId = $(this).data('product-id');
        const quantity = $('#quantity').val() || 1;
        
        $.ajax({
            url: '/cart/add',
            method: 'POST',
            data: { productId, quantity },
            success: function(response) {
                if (response.success) {
                    // Show success message with SweetAlert2
                    showCartSuccessAlert('Your product has been successfully added to your cart.');
                    
                    // Update cart count
                    updateCartCount(response.cartCount);
                }
            },
            error: function() {
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
    
    // Checkout button
    $('#checkout-btn').on('click', function() {
        // Check if user is logged in
        const isLoggedIn = Boolean($('body').data('user-id'));
        
        if (!isLoggedIn) {
            // If not logged in, redirect to login page with returnUrl
            window.location.href = '/users/login?returnUrl=' + encodeURIComponent('/cart/checkout');
            return;
        }
        
        // If logged in, proceed to checkout
        window.location.href = '/cart/checkout';
    });
    
    // Helper functions
    function updateCartCount(count) {
        $('.cart-count').text(count);
    }
    
    function updateWishlistCount(count) {
        $('.wishlist-count').text(count);
    }
    
    function updateCartSummary(total) {
        // Update subtotal
        $('#cart-subtotal').text('$' + total);
        
        // Update tax (10% of subtotal)
        const tax = (parseFloat(total) * 0.1).toFixed(2);
        $('#cart-tax').text('$' + tax);
        
        // Update total (subtotal + tax)
        const grandTotal = (parseFloat(total) * 1.1).toFixed(2);
        $('#cart-total').text('$' + grandTotal);
    }
    
    // SweetAlert2 success popup for cart operations
    function showCartSuccessAlert(message = 'Product added to cart!') {
        Swal.fire({
            icon: 'success',
            title: 'Product Added!',
            text: message,
            showConfirmButton: true,
            confirmButtonText: 'OK',
            confirmButtonColor: '#28a745',
            allowOutsideClick: false,
            allowEscapeKey: false
        });
    }
    
    // SweetAlert2 error popup for cart operations
    function showCartErrorAlert(message = 'Something went wrong. Please try again.') {
        Swal.fire({
            icon: 'error',
            title: 'Error!',
            text: message,
            showConfirmButton: true,
            confirmButtonText: 'OK',
            confirmButtonColor: '#dc3545'
        });
    }
    
    // Generic SweetAlert2 success popup
    function showSuccessAlert(message) {
        Swal.fire({
            icon: 'success',
            title: 'Success!',
            text: message,
            timer: 2000,
            timerProgressBar: true,
            showConfirmButton: true,
            confirmButtonText: 'OK',
            confirmButtonColor: '#28a745'
        });
    }
    
    // Generic SweetAlert2 error popup
    function showErrorAlert(message) {
        Swal.fire({
            icon: 'error',
            title: 'Error!',
            text: message,
            showConfirmButton: true,
            confirmButtonText: 'OK',
            confirmButtonColor: '#dc3545'
        });
    }
    
    // Legacy showAlert function for backward compatibility
    function showAlert(type, message) {
        if (type === 'success') {
            showSuccessAlert(message);
        } else if (type === 'danger' || type === 'error') {
            showErrorAlert(message);
        } else {
            // Fallback to generic success for other types
            showSuccessAlert(message);
        }
    }
});
