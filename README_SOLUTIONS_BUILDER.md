# Solutions Builder AI 🚀

An AI-powered cloud architecture design tool that helps you build comprehensive cloud solutions through an intuitive wizard interface.

## 🎯 Overview

Solutions Builder AI is a modern web application built with Angular 21 and Bootstrap 5 that guides users through a multi-step process to design cloud architectures based on their business requirements.

## ✨ Features

- **Multi-Step Wizard Interface**
  - Step 1: Problem Input - Define your industry and business requirements
  - Step 2: Data Sources - Configure your data sources and integrations
  - Step 3: Architecture - Review and generate your cloud architecture

- **Modern Dark Theme UI** matching your design specifications
- **Real-time Form Validation**
- **Dynamic Data Source Management**
- **Interactive Step Navigation**
- **Responsive Design** - Works on all devices

## 🏗️ Project Structure

```
src/app/
├── components/
│   ├── header/              # Navigation header
│   ├── home/                # Main wizard container
│   ├── problem-input/       # Step 1: Problem definition
│   ├── data-sources/        # Step 2: Data sources configuration
│   ├── architecture/        # Step 3: Architecture review & generation
│   ├── products/            # Example products page
│   └── users/               # Example users page
├── services/
│   └── data.ts              # Data service
└── app.routes.ts            # Application routing
```

## 🎨 UI Components

### Step 1: Problem Input
- Industry Category dropdown
- Business Scenario textarea
- Additional Context selector (Document, PDF, Audio, Video)
- Data Sources preview

### Step 2: Data Sources
- Add/Remove data sources
- Configure source name and type
- Support for multiple database types (PostgreSQL, MySQL, MongoDB, Redis, S3, APIs)

### Step 3: Architecture
- Review all inputs
- Summary cards showing configured options
- Generate architecture button
- Loading state with spinner
- Success message on generation

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or later)
- npm (Node Package Manager)
- Angular CLI

### Installation

1. Navigate to the project directory:
```bash
cd "Solutions builder AI/solutions-builder-ai"
```

2. Install dependencies (already done):
```bash
npm install
```

### Running the Application

**Start development server:**
```bash
ng serve
```

**Start and open in browser:**
```bash
ng serve --open
```

The application will be available at `http://localhost:4200/`

## 🎨 Design System

### Color Palette
- **Primary Dark**: `#1a1d29`
- **Secondary Dark**: `#252936`
- **Accent Blue**: `#4a9eff`
- **Text Light**: `#e4e6eb`
- **Text Muted**: `#8b92a8`
- **Border Color**: `#3a3f51`

### Typography
- **Font Family**: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif
- **Title**: 28px, weight 600
- **Subtitle**: 16px
- **Body**: 14-16px

### Components
- **Cards**: Dark background with border, hover effects
- **Buttons**: Rounded 8px, hover animations
- **Form Inputs**: Dark themed with blue focus states
- **Step Indicators**: Circular with progress line

## 📱 Responsive Breakpoints

- **Mobile**: < 768px
- **Tablet**: 768px - 991px
- **Desktop**: ≥ 992px

## 🔧 Customization

### Adding New Industries
Edit the industry dropdown in `src/app/components/problem-input/problem-input.html`

### Adding New Data Source Types
Edit the type dropdown in `src/app/components/data-sources/data-sources.html`

### Modifying Styles
- Global styles: `src/styles.css`
- Component-specific: `src/app/components/[component]/[component].css`

## 📊 Data Flow

1. **User Input** → Problem Input Component
2. **Form Data** → Shared via `formData` object
3. **Data Sources** → Added/Removed dynamically
4. **Architecture** → Reviews and generates based on inputs

## 🛠️ Technologies Used

- **Angular 21** - Latest framework with standalone components
- **TypeScript** - Type-safe development
- **Bootstrap 5** - Responsive grid and components
- **Bootstrap Icons** - Icon library
- **RxJS** - Reactive programming
- **FormsModule** - Template-driven forms

## 📝 Key Features Implemented

### 1. Wizard Navigation
- Step-by-step progression
- Visual step indicators
- Active/completed states
- Back navigation

### 2. Form Management
- Two-way data binding
- Form validation
- Dynamic field visibility
- Context selection

### 3. Data Source Management
- Add new data sources
- Remove existing sources
- Multiple source types
- Real-time updates

### 4. Architecture Generation
- Summary review
- Generation simulation
- Loading states
- Success feedback

## 🎯 Future Enhancements

- [ ] Connect to real AI/ML backend API
- [ ] Save/Load project functionality
- [ ] Export architecture diagrams
- [ ] Multiple cloud provider support (AWS, Azure, GCP)
- [ ] Cost estimation
- [ ] Security best practices checker
- [ ] Collaboration features
- [ ] Version history
- [ ] Template library

## 📖 Component Documentation

### Home Component
Main container for the wizard. Manages:
- Current step state
- Form data object
- Step navigation
- Component switching

### Problem Input Component
Handles:
- Industry selection
- Business scenario input
- Additional context selection
- Emits `nextStep` event

### Data Sources Component
Manages:
- Data source list
- Add/remove operations
- Form for new sources
- Emits `nextStep` and `prevStep` events

### Architecture Component
Displays:
- Input summary
- Data source list
- Generate button
- Loading/Success states
- Emits `prevStep` event

## 🔐 Security Notes

- All data stored in component state (client-side)
- No backend API calls yet
- Form validation prevents empty submissions
- XSS protection through Angular's built-in sanitization

## 📄 License

MIT License

## 👨‍💻 Development

Built with Angular 21 and modern web technologies following best practices for:
- Component architecture
- Type safety
- Responsive design
- User experience
- Code maintainability

---

**Solutions Builder AI** - Empowering cloud architecture design with AI 🚀
