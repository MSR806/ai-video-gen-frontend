import type { Project } from '@core/project';
import type { ProjectRepository } from '@core/project';

/**
 * Implementation of ProjectRepository
 */
export class ProjectRepositoryImpl implements ProjectRepository {
  private projects: Project[] = [
    {
      id: '1',
      name: 'Product Demo Showcase',
      description:
        'Create an engaging product demonstration video highlighting key features and benefits for our SaaS platform launch.',
      status: 'in-progress',
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-03'),
    },
    {
      id: '2',
      name: 'Tutorial Series - Getting Started',
      description:
        'Comprehensive tutorial series covering setup, basic features, and best practices for new users.',
      status: 'draft',
      createdAt: new Date('2026-01-02'),
      updatedAt: new Date('2026-01-02'),
    },
    {
      id: '3',
      name: 'Marketing Campaign - Q1 2026',
      description:
        'Social media marketing videos for Instagram, TikTok, and YouTube promoting our new AI-powered features.',
      status: 'completed',
      createdAt: new Date('2025-12-15'),
      updatedAt: new Date('2025-12-28'),
    },
    {
      id: '4',
      name: 'Customer Success Stories',
      description:
        'Interview-style testimonial videos featuring real customers sharing their experience and results.',
      status: 'in-progress',
      createdAt: new Date('2025-12-20'),
      updatedAt: new Date('2026-01-03'),
    },
    {
      id: '5',
      name: 'Company Culture Video',
      description:
        'Behind-the-scenes look at our team, office culture, and company values for recruitment and brand awareness.',
      status: 'draft',
      createdAt: new Date('2026-01-03'),
      updatedAt: new Date('2026-01-03'),
    },
    {
      id: '6',
      name: 'Explainer Video - AI Features',
      description:
        'Animated explainer breaking down complex AI concepts into simple, digestible content for non-technical audience.',
      status: 'completed',
      createdAt: new Date('2025-11-10'),
      updatedAt: new Date('2025-11-30'),
    },
    {
      id: '7',
      name: 'Webinar Recording - Advanced Tips',
      description:
        'Professional recording of live webinar with Q&A session, screen recordings, and presenter overlays.',
      status: 'in-progress',
      createdAt: new Date('2025-12-28'),
      updatedAt: new Date('2026-01-02'),
    },
    {
      id: '8',
      name: 'Event Highlight Reel',
      description:
        'High-energy montage from annual conference with keynote moments, networking footage, and sponsor highlights.',
      status: 'completed',
      createdAt: new Date('2025-10-05'),
      updatedAt: new Date('2025-10-20'),
    },
  ];

  async getAllProjects(): Promise<Project[]> {
    return Promise.resolve([...this.projects]);
  }

  async getById(id: string): Promise<Project | null> {
    const project = this.projects.find((p) => p.id === id);
    return Promise.resolve(project || null);
  }
}
