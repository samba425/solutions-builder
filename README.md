# Solutions Builder AI

A modern web application for designing cloud architecture solutions using AI. This wizard-based interface helps users define their technical requirements and generates comprehensive cloud solution architectures.

![Angular](https://img.shields.io/badge/Angular-21.0.0-red)
![Bootstrap](https://img.shields.io/badge/Bootstrap-5.3.0-purple)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6.0-blue)
![Node](https://img.shields.io/badge/Node-18.x%20%7C%2020.x%20%7C%2022.x-green)

## 🚀 Features

- **3-Step Wizard Interface**
  - Step 1: Problem Input (Industry, Business Scenario, Context Files, Data Sources)
  - Step 2: Review Your Input (Comprehensive review with edit capabilities)
  - Step 3: Architecture Generation (AI-powered solution generation)

- **Modern UI/UX**
  - Dark theme with gradient backgrounds
  - Responsive design
  - Smooth animations and transitions
  - Step indicators with completion status

- **Data Source Management**
  - Add/Edit/Remove data sources
  - Multiple data source types (Database, File Storage, API, Stream, etc.)
  - Format, volume, and frequency specifications

- **Context Management**
  - Upload and manage context files (Documents, PDFs, Audio, Video)
  - Visual file type indicators
  - File size display

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: v18.x, v20.x, or v22.x (LTS recommended)
- **npm**: v9.x or higher (comes with Node.js)
- **Git**: For version control

You can verify your installations:

```bash
node --version
npm --version
git --version
```

## 🛠️ Technology Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Angular | 21.0.0 | Frontend framework |
| TypeScript | 5.6.2 | Programming language |
| Bootstrap | 5.3.3 | CSS framework |
| Bootstrap Icons | 1.11.0 | Icon library |
| Angular SSR | 21.0.4 | Server-side rendering |
| RxJS | 7.8.1 | Reactive programming |

## 📦 Installation

### Method 1: Standard Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/samba425/solutions-builder.git
   cd solutions-builder-ai
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm start
   ```

4. **Open your browser**
   Navigate to `http://localhost:4200/`

The application will automatically reload when you make changes to the source files.

### Method 2: Docker Installation

#### Using Docker Compose (Recommended)

1. **Clone the repository**
   ```bash
   git clone https://github.com/samba425/solutions-builder.git
   cd solutions-builder-ai
   ```

2. **Start the application**
   ```bash
   docker-compose up
   ```

3. **Access the application**
   Open your browser and navigate to `http://localhost:4200/`

4. **Stop the application**
   ```bash
   docker-compose down
   ```

#### Using Docker CLI

1. **Build the Docker image**
   ```bash
   docker build -t solutions-builder-ai .
   ```

2. **Run the container**
   ```bash
   docker run -p 4200:4200 solutions-builder-ai
   ```

3. **Access the application**
   Open your browser and navigate to `http://localhost:4200/`

## 🏗️ Build

### Development Build
```bash
npm run build
```

The build artifacts will be stored in the `dist/` directory.

### Production Build
```bash
ng build --configuration production
```

This creates an optimized production build with:
- Minification
- Tree shaking
- Ahead-of-Time (AOT) compilation
- Server-side rendering support

## 🧪 Running Tests

### Unit Tests
```bash
ng test
```

This executes unit tests via [Karma](https://karma-runner.github.io).

### End-to-End Tests
```bash
ng e2e
```

## 📂 Project Structure

```
solutions-builder-ai/
├── src/
│   ├── app/
│   │   ├── components/
│   │   │   ├── home/              # Main wizard container
│   │   │   ├── problem-input/     # Step 1: Problem input form
│   │   │   ├── review/            # Step 2: Review screen
│   │   │   └── architecture/      # Step 3: Architecture generation
│   │   ├── app.component.ts       # Root component
│   │   ├── app.config.ts          # App configuration
│   │   └── app.routes.ts          # Routing configuration
│   ├── styles.css                 # Global styles
│   ├── index.html                 # HTML entry point
│   └── main.ts                    # Application bootstrap
├── public/                        # Static assets
├── angular.json                   # Angular CLI configuration
├── package.json                   # Dependencies and scripts
├── tsconfig.json                  # TypeScript configuration
├── Dockerfile                     # Docker configuration
├── docker-compose.yml             # Docker Compose configuration
└── README.md                      # This file
```

## 🎨 Component Overview

### Home Component
- Main wizard container
- Manages step navigation
- Shared form data state
- Step indicators with progress tracking

### Problem Input Component
- Industry category selection
- Business scenario textarea
- Context file management (Document, PDF, Audio, Video)
- Data source management with modal
- Form validation

### Review Component
- Comprehensive input review
- Section-wise edit capabilities
- Industry, Business, Context, and Data Sources display
- Navigation to previous step or architecture generation

### Architecture Component
- Final review before generation
- Edit functionality for each section
- Smart navigation (different sections → different steps)
- Architecture generation trigger

## 🐳 Docker Configuration

### Dockerfile Features
- Multi-stage build for optimal image size
- Node.js 20 Alpine base image
- Production-optimized build
- Port 4200 exposed
- Health check included

### Docker Compose Features
- Single command deployment
- Volume mounting for development
- Automatic restart policy
- Port mapping configuration

## 🔧 Available Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start development server on port 4200 |
| `npm run build` | Build the project for development |
| `ng build --configuration production` | Build the project for production |
| `ng test` | Run unit tests |
| `ng serve` | Serve the application |

## 🎯 Usage Guide

### Step 1: Problem Input
1. Select your industry category from the dropdown
2. Describe your business scenario in the textarea
3. (Optional) Add context by clicking context buttons (Document, PDF, Audio, Video)
4. Add data sources by clicking "Add Data Source"
5. Fill in data source details (Name*, Type*, Format, Volume, Frequency, Description)
6. Click "Continue to Preview"

### Step 2: Review Your Input
1. Review all entered information
2. Click "Edit" on any section to make changes
   - Industry/Business/Context edits → Go back to Step 1
   - Data Sources edit → Opens modal for inline editing
3. Click "Continue to Preview" to proceed

### Step 3: Architecture
1. Final review of all inputs
2. Edit any section if needed
3. Click "Generate Architecture" to create your solution

## 🐛 Troubleshooting

### Port Already in Use
If port 4200 is already in use:
```bash
# Find the process using port 4200
lsof -i :4200

# Kill the process
kill -9 <PID>

# Or use a different port
ng serve --port 4201
```

### Node Version Issues
```bash
# Check Node version
node --version

# Use nvm to switch versions
nvm install 20
nvm use 20
```

### Docker Issues
```bash
# Clean up Docker containers and images
docker-compose down -v
docker system prune -a

# Rebuild from scratch
docker-compose up --build
```

## 📝 Development Guidelines

### Code Style
- Follow Angular style guide
- Use TypeScript strict mode
- Write meaningful component/variable names
- Add comments for complex logic

### Component Structure
- Use standalone components
- Implement OnPush change detection where possible
- Keep components focused and small
- Use @Input/@Output for component communication

### Styling
- Use CSS variables for theming
- Follow BEM naming convention
- Keep styles scoped to components
- Use Bootstrap utilities when possible

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 👨‍💻 Author

**Sambasiva**
- GitHub: [@samba425](https://github.com/samba425)

## 🙏 Acknowledgments

- Angular Team for the amazing framework
- Bootstrap Team for the UI components
- All contributors and supporters

## 📞 Support

If you have any questions or need help, please:
- Open an issue on GitHub
- Contact the development team

## Additional Resources

For more information on using the Angular CLI, visit the [Angular CLI Documentation](https://angular.dev/tools/cli).

---

**Built with ❤️ using Angular 21 and Bootstrap 5**

