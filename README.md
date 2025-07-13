# Business Model Canvas AI

An AI-powered web application that transforms traditional 2D business model canvases into interactive 3D experiences with intelligent business analysis and Microsoft technology integration.

![Business Model Canvas 3D Visualization](./attached_assets/image_1752374903068.png)

## 🚀 Features

### Interactive Visualization
- **2D Canvas View**: Traditional business model canvas layout with clean grid design
- **3D Canvas View**: Immersive Babylon.js-powered 3D visualization with dynamic animations
- **Smooth Transitions**: Instant switching between 2D and 3D modes
- **Interactive Elements**: Click on any section to view detailed content panels

### Dynamic Animations
- **Revenue Streams**: Green box with height growth animation (100% → 130% → 50%) and live dollar counter
- **Cost Structure**: Red box with rapid pulse animation (100% → 33%) and live dollar counter  
- **Customer Relationships**: Red/yellow flashing sequence (3 red flashes + 2s yellow sustained)
- **Value Propositions**: Prominent white double-height central pillar

### AI-Powered Analysis
- **Microsoft Copilot Integration**: Authentic Microsoft Copilot branding and API integration
- **OpenAI GPT-4 Fallback**: Intelligent business model analysis when Microsoft APIs unavailable
- **Context-Aware Chat**: Real-time conversation with awareness of current canvas state
- **Business Insights**: AI-generated recommendations for business model optimization

### Microsoft Technology Stack
- **Microsoft Graph API**: Organizational data integration for enhanced business insights
- **Azure Authentication**: Secure enterprise-grade authentication system
- **Professional UI**: Microsoft Copilot logo and consistent design language
- **Enterprise Ready**: Built for Microsoft 365 environments

## 🛠 Technology Stack

### Frontend
- **React 18** with TypeScript for type-safe component development
- **Babylon.js** for advanced 3D rendering and animations
- **Tailwind CSS** for responsive utility-first styling
- **Radix UI** for accessible component primitives
- **Zustand** for lightweight state management
- **TanStack Query** for server state management

### Backend
- **Node.js & Express** for RESTful API server
- **TypeScript** for full-stack type safety
- **PostgreSQL** with Drizzle ORM for data persistence
- **Microsoft Graph SDK** for organizational data access
- **OpenAI API** for AI-powered business analysis

### Development Tools
- **Vite** for fast development and optimized builds
- **ESLint & Prettier** for code quality and formatting
- **Drizzle Kit** for database migrations
- **Azure SDK** for Microsoft cloud integration

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- Microsoft Azure app registration (for Graph API)
- OpenAI API key

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/MikePell-Env/BusinessModelAI.git
   cd BusinessModelAI
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment configuration**
   ```bash
   cp .env.example .env
   ```
   
   Configure your `.env` file:
   ```env
   DATABASE_URL=postgresql://username:password@localhost:5432/business_model_ai
   OPENAI_API_KEY=your_openai_api_key_here
   MICROSOFT_CLIENT_ID=your_azure_app_client_id
   MICROSOFT_CLIENT_SECRET=your_azure_app_client_secret
   MICROSOFT_TENANT_ID=your_azure_tenant_id
   ```

4. **Database setup**
   ```bash
   npm run db:migrate
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:5000`

## 🎯 Usage

### Creating a Business Model Canvas
1. Open the application in your browser
2. View the default sample business model canvas in 2D mode
3. Click **"3D View"** to switch to immersive 3D visualization
4. Click on any section to view and edit detailed content

### AI-Powered Analysis
1. Click the **Microsoft Copilot** chat button
2. Ask questions about your business model:
   - "Analyze my revenue streams"
   - "What are potential risks in my business model?"
   - "Suggest improvements for customer relationships"
3. Get intelligent, context-aware responses based on your canvas data

### Interactive 3D Features
- **Hover Effects**: Boxes highlight when you hover over them
- **Click Interactions**: View detailed content panels for each section
- **Live Animations**: Watch financial indicators update in real-time
- **Dynamic Counters**: Revenue and cost values change with animations

## 🏗 Architecture

### Project Structure
```
├── client/                 # React frontend application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── lib/           # Utilities and stores
│   │   └── types/         # TypeScript type definitions
├── server/                # Express backend server
│   ├── routes.ts          # API endpoint definitions
│   └── services/          # Business logic and external API integrations
├── shared/                # Shared types and schemas
└── docs/                  # Additional documentation
```

### Data Flow
1. **Canvas Loading**: Sample data loaded from JSON on startup
2. **State Management**: Zustand stores manage canvas state and chat history
3. **AI Integration**: Chat messages processed through Microsoft Copilot → OpenAI → local fallback
4. **Real-time Updates**: Canvas modifications reflected in both 2D and 3D views
5. **Database Persistence**: Canvas data and user sessions stored in PostgreSQL

## 🔧 Configuration

### Microsoft Graph API Setup
1. Register an app in Azure Active Directory
2. Configure API permissions for Microsoft Graph
3. Add client credentials to environment variables
4. Test connection using the built-in status component

### OpenAI Integration
1. Obtain API key from OpenAI platform
2. Configure usage quotas and rate limiting
3. Set up fallback responses for quota exceeded scenarios

## 🚀 Deployment

### Replit Deployment (Recommended)
1. Connect your GitHub repository to Replit
2. Configure environment secrets in Replit
3. Click **Deploy** to publish your application
4. Access via `.replit.app` domain

### Manual Deployment
1. **Build the application**
   ```bash
   npm run build
   ```

2. **Start production server**
   ```bash
   npm start
   ```

3. **Configure reverse proxy** (nginx, Apache)
4. **Set up SSL certificate** for HTTPS
5. **Configure environment variables** on your hosting platform

## 📚 API Documentation

### Canvas Endpoints
- `GET /api/canvas` - Retrieve current business model canvas
- `PUT /api/canvas` - Update canvas sections
- `POST /api/canvas/analyze` - Get AI analysis of canvas

### Chat Endpoints  
- `POST /api/chat` - Send message to AI assistant
- `GET /api/chat/history` - Retrieve chat conversation history

### Status Endpoints
- `GET /api/status/microsoft` - Check Microsoft Graph API connectivity
- `GET /api/health` - Application health check

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- **GitHub Repository**: [https://github.com/MikePell-Env/BusinessModelAI](https://github.com/MikePell-Env/BusinessModelAI)
- **Live Demo**: [Coming Soon]
- **Documentation**: [/docs](./docs)

## 📞 Support

For questions, issues, or feature requests:
- Open an issue on GitHub
- Contact: [Your Contact Information]

---

**Built with ❤️ using Microsoft technologies and modern web standards**