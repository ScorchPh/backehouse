# ==============================================================================
# BAKE HOUSE - Production PHP Apache Container for Render / Cloud Deployment
# ==============================================================================
FROM php:8.2-apache

# Enable Apache modules for CORS and rewrite rules
RUN a2enmod rewrite headers

# Install MySQL PDO extension
RUN docker-php-ext-install pdo pdo_mysql

# Set working directory to Apache web root
WORKDIR /var/www/html

# Copy backend files into container
COPY backend/ /var/www/html/

# Set permissions for uploads and database data folders
RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 775 /var/www/html/uploads \
    && chmod -R 775 /var/www/html/database

# Expose HTTP port 80
EXPOSE 80

# Run Apache in foreground
CMD ["apache2-foreground"]
