# Angular Bootstrap App

A modern, responsive web application built with **Angular 21** (latest) and **Bootstrap 5**, featuring standalone components and dynamic data management.

## 🚀 Features

- ✅ **Latest Angular 21** Framework (with Standalone Components)
- ✅ **Bootstrap 5** Integration with responsive design
- ✅ **Bootstrap Icons** for beautiful UI elements
- ✅ **Routing** with Angular Router
- ✅ **Dynamic Data** from service layer with RxJS Observables
- ✅ **Separate Components** for better code organization
- ✅ **TypeScript** for type safety
- ✅ **Server-Side Rendering (SSR)** enabled

## 📁 Project Structure

```
solutions-builder-ai/
├── public/
│   └── data.json                # JSON data file
├── src/
│   ├── app/
│   │   ├── components/
│   │   │   ├── header/          # Navigation header component
│   │   │   │   ├── header.ts
│   │   │   │   ├── header.html
│   │   │   │   └── header.css
│   │   │   ├── home/            # Home page component
│   │   │   │   ├── home.ts
│   │   │   │   ├── home.html
│   │   │   │   └── home.css
│   │   │   ├── products/        # Products listing component
│   │   │   │   ├── products.ts
│   │   │   │   ├── products.html
│   │   │   │   └── products.css
│   │   │   └── users/           # Users/Team listing component
│   │   │       ├── users.ts
│   │   │       ├── users.html
│   │   │       └── users.css
│   │   ├── services/
│   │   │   └── data.ts          # Data service with JSON data
│   │   ├── app.routes.ts        # Application routing
│   │   ├── app.config.ts        # App configuration
│   │   ├── app.ts               # Root component
│   │   └── app.html             # Root template
│   ├── styles.css               # Global styles
│   └── index.html               # Main HTML file
├── angular.json                 # Angular configuration
└── package.json                 # Dependencies
```

## 📦 Components

### 1. **Header Component** (`components/header/`)
- Responsive navigation bar with Bootstrap navbar
- Active route highlighting with RouterLinkActive
- Mobile-friendly hamburger menu
- Bootstrap icons integration

### 2. **Home Component** (`components/home/`)
- Welcome page with hero section
- Feature highlights with icon cards
- Call-to-action buttons with routing
- Gradient background styling

### 3. **Products Component** (`components/products/`)
- Dynamic product grid layout
- Product cards with:
  - Images
  - Descriptions
  - Prices
  - Category badges
  - Add to cart buttons
- Data loaded from DataService
- Uses Angular 21's new `@for` control flow syntax

### 4. **Users Component** (`components/users/`)
- Team members grid layout
- User cards with:
  - Avatar images
  - Names and emails
  - Role badges
  - Action buttons (Message, Profile)
- Data loaded from DataService
- Uses Angular 21's new `@for` control flow syntax

## 🔧 Services

### **DataService** (`services/data.ts`)
- Centralized data management
- Provides Product and User data
- Observable-based data retrieval using RxJS
- Type-safe interfaces:
  - `Product`: id, name, price, description, category, image
  - `User`: id, name, email, role, avatar
- Methods:
  - `getProducts()`: Returns all products
  - `getProductById(id)`: Returns specific product
  - `getUsers()`: Returns all users
  - `getUserById(id)`: Returns specific user

## 🛣️ Routing

The application uses Angular Router with the following routes:

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | Home | Landing page with features |
| `/products` | Products | Product catalog |
| `/users` | Users | Team members |
| `**` | Home | Redirect to home (fallback) |

## 🎨 Styling

- **Bootstrap 5** for responsive grid and components
- **Bootstrap Icons** for UI icons
- Custom CSS with:
  - Gradient backgrounds
  - Card hover effects
  - Smooth transitions
  - Custom navbar styling

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or later)
- npm (Node Package Manager)

### Installation

1. **Navigate to the project directory:**
   ```bash
   cd solutions-builder-ai
   ```

2. **Install dependencies (already done):**
   ```bash
   npm install
   ```

### Running the Application

**Development Server:**
```bash
ng serve
```

**Development Server (with auto-open):**
```bash
ng serve --open
```

The application will be available at `http://localhost:4200/`

### Building for Production

```bash
ng build
```

The build artifacts will be stored in the `dist/` directory.

## 📚 Technologies Used

- **Angular 21** - Latest Angular framework with standalone components
- **TypeScript** - Typed superset of JavaScript
- **Bootstrap 5** - CSS framework for responsive design
- **Bootstrap Icons** - Icon library
- **RxJS** - Reactive programming library
- **Angular Router** - Client-side routing
- **Angular SSR** - Server-side rendering

## 🎯 Key Features Demonstrated

### Modern Angular Patterns
- ✅ Standalone components (no NgModules)
- ✅ New control flow syntax (`@for`, `@if`)
- ✅ Dependency injection
- ✅ Reactive programming with Observables
- ✅ Component lifecycle hooks (OnInit)

### Bootstrap Integration
- ✅ Responsive grid system
- ✅ Navigation components
- ✅ Cards and badges
- ✅ Buttons and forms
- ✅ Utility classes

### Best Practices
- ✅ Component separation
- ✅ Service layer for data
- ✅ Type-safe interfaces
- ✅ Routing configuration
- ✅ Responsive design
- ✅ Clean code structure

## 🔄 Dynamic Data

The application uses a service-based architecture where:
1. **DataService** holds the data (simulating an API)
2. **Components** inject the service
3. **Components** subscribe to Observable data
4. **Templates** display the data using Angular bindings

### Sample Data Structure

**Products:**
```json
{
  "id": 1,
  "name": "Laptop Pro 15",
  "price": 1299.99,
  "description": "High-performance laptop with 16GB RAM and 512GB SSD",
  "category": "Electronics",
  "image": "https://..."
}
```

**Users:**
```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john.doe@example.com",
  "role": "Administrator",
  "avatar": "https://..."
}
```

## 🎨 Customization

### Adding New Products/Users
Edit the data arrays in `src/app/services/data.ts`

### Changing Styles
- Global styles: `src/styles.css`
- Component styles: `src/app/components/[component]/[component].css`

### Adding New Routes
1. Create a new component: `ng generate component components/new-page`
2. Add route to `src/app/app.routes.ts`
3. Add navigation link in `header.html`

## 📱 Responsive Design

The application is fully responsive with breakpoints:
- Mobile: < 768px
- Tablet: 768px - 991px
- Desktop: ≥ 992px

## 🚧 Future Enhancements

- [ ] Add shopping cart functionality
- [ ] Implement search and filter
- [ ] Connect to real backend API
- [ ] Add authentication
- [ ] User profile pages
- [ ] Form validation
- [ ] Product detail pages
- [ ] Dark mode toggle

## 📄 License

MIT License

## 👨‍💻 Author

Created as a demonstration of modern Angular and Bootstrap integration.

---

**Happy Coding! 🎉**
