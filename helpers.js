// Custom Handlebars helpers - Templates mein use hone wale helper functions
module.exports = {
    // Equality comparison helper - do values equal hain ya nahi check karta hai
    eq: function(a, b) {
        return a === b; // True agar dono values same hain
    },
    
    // Not equal comparison helper - do values different hain ya nahi check karta hai
    ne: function(a, b) {
        return a !== b; // True agar dono values different hain
    },
    
    // Greater than comparison helper - pehli value dusri se badi hai ya nahi
    gt: function(a, b) {
        return a > b; // True agar a, b se bada hai
    },
    
    // Less than comparison helper - pehli value dusri se choti hai ya nahi
    lt: function(a, b) {
        return a < b; // True agar a, b se chota hai
    },
    
    // Multiplication helper - do numbers ko multiply kar ke 2 decimal places mein return karta hai
    multiply: function(a, b) {
        return (a * b).toFixed(2); // Multiply kar ke 2 decimal places tak round karo
    },
    
    // Currency format helper - number ko PKR currency format mein convert karta hai
    formatCurrency: function(num) {
        return 'PKR ' + parseFloat(num).toFixed(2); // PKR prefix ke saath 2 decimal places
    },
    
    // Price format helper - order pages ke liye price ko 2 decimal places mein format karta hai
    formatPrice: function(price) {
        return parseFloat(price).toFixed(2); // Sirf number, 2 decimal places tak
    },
    
    // Text truncate helper - lambi text ko short kar ke ... lagata hai
    truncate: function(str, len) {
        if (!str) return ''; // Agar string nahi hai to empty return karo
        if (str.length > len) {
            return str.substring(0, len) + '...'; // Length se zyada hai to cut kar ke ... lagao
        }
        return str; // Warna original string return karo
    },
    
    // Date format helper - date ko readable format mein convert karta hai
    formatDate: function(date) {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric', // Pura saal (2024)
            month: 'long', // Pura mahina naam (January)
            day: 'numeric' // Din number (15)
        });
    },
    
    // Conditional select helper - dropdown options mein selected value mark karta hai
    select: function(selected, options) {
        return options.fn(this)
            .replace(new RegExp(' value="' + selected + '"'), '$& selected="selected"');
        // Selected value ko HTML mein selected attribute add karta hai
    },
    
    // Category slug ko display name mein convert karta hai
    categoryName: function(category) {
        switch (category) {
            case 'men-clothing':
                return "Men's Clothing"; // Mard ka kapda
            case 'women-clothing':
                return "Women's Clothing"; // Aurat ka kapda
            case 'accessories':
                return "Accessories"; // Accessories
            case 'electronics':
                return "Electronics"; // Electronics
            default:
                return category; // Agar koi match nahi to original return karo
        }
    },
    
    // URI encoding helper - string ko URL safe format mein convert karta hai
    encodeURIComponent: function(str) {
        return encodeURIComponent(str); // Special characters ko URL encoding karta hai
    },
    
    // Date aur time format helper - date ke saath time bhi dikhata hai
    formatDateTime: function(date) {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric', // Pura saal
            month: 'long', // Pura mahina naam
            day: 'numeric', // Din number
            hour: '2-digit', // Ghanta (2 digits)
            minute: '2-digit' // Minute (2 digits)
        });
    },
    
    // OR logic helper - multiple conditions mein se koi ek true hai ya nahi check karta hai
    or: function() {
        // Arguments ko array mein convert kar ke check karo ke koi true hai ya nahi
        return Array.prototype.slice.call(arguments, 0, -1).some(Boolean);
    },
    
    // Wishlist check helper - product user ke wishlist mein hai ya nahi check karta hai
    isInWishlist: function(productId, wishlist) {
        if (!wishlist) return false; // Agar wishlist nahi hai to false
        
        // Product ID ko string mein convert karo comparison ke liye
        const prodId = productId.toString();
        
        // Wishlist mein product ID find karo
        return wishlist.some(item => {
            // Dono cases handle karo: object form mein ya sirf ID form mein
            if (typeof item === 'object' && item._id) {
                return item._id.toString() === prodId; // Object case
            }
            return item.toString() === prodId; // ID case
        });
    },
    
    // Array join helper - array elements ko separator se join karta hai
    join: function(array, separator) {
        if (!array || !Array.isArray(array)) return ''; // Agar array nahi hai to empty
        return array.join(separator || ', '); // Default separator comma hai
    }
}; 