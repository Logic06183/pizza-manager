# Mobile Pizza Dashboard

This is a mobile-friendly dashboard that connects to your Firebase database to display pizza orders in real-time. It's designed to work well on smartphones and can be easily deployed to GitHub Pages.

## Features

- **Mobile-optimized UI**: Works great on phones and tablets
- **Real-time updates**: See new orders as they come in
- **Tab filtering**: Easily filter by order status
- **Order details**: View full order information including pizzas and toppings
- **Offline support**: Works even with intermittent connectivity

## Deployment to GitHub Pages

Follow these steps to deploy the dashboard to GitHub Pages so your mom can access it from her phone:

1. Create a new GitHub repository
2. Upload the files in this folder (`index.html`, `styles.css`, and `app.js`) to your repository
3. Go to the repository settings
4. Scroll down to the "GitHub Pages" section
5. Select the branch that contains your files (usually `main`)
6. Click "Save"
7. GitHub will provide you with a URL (typically `https://yourusername.github.io/repository-name`)
8. Share this URL with your mom - she can bookmark it on her phone for easy access

## Local Testing

You can test the dashboard locally by opening the `index.html` file in a web browser. To see it as it would appear on a mobile device, use your browser's developer tools to enable mobile view (in Chrome, right-click and select "Inspect", then click the mobile device icon).

## Customization

- Colors and styling can be modified in the `styles.css` file
- Firebase configuration is in `app.js` (line 2-9)
- The number of orders displayed can be changed in `app.js` (see the `limit(20)` value)
