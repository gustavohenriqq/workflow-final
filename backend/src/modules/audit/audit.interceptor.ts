import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';

const AUDITABLE_ACTIONS: Record<string, string> = {
  'POST /api/v1/workflows': 'workflow.created',
  'PATCH /api/v1/workflows': 'workflow.updated',
  'POST /api/v1/versions': 'version.created',
  'PATCH /api/v1/versions': 'version.updated',
  'POST /api/v1/instances': 'instance.created',
  'PATCH /api/v1/instances': 'instance.cancelled',
  'POST /api/v1/step-executions': 'decision.made',
};

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const method = req.method;
    const path = req.route?.path || req.url;
    const user = req.user;

    const actionKey = `${method} ${path}`;
    const action = this.resolveAction(method, path);

    if (!action || !user) return next.handle();

    return next.handle().pipe(
      tap(async (responseData) => {
        try {
          await this.prisma.auditEvent.create({
            data: {
              tenantId: user.tenantId || 'unknown',
              actorId: user.sub,
              action,
              entityType: this.resolveEntityType(path),
              entityId: responseData?.id || req.params?.id || 'unknown',
              payloadAfter: responseData || null,
              metadata: {
                method,
                path,
                ip: req.ip,
                userAgent: req.headers['user-agent'],
                correlationId: req.headers['x-correlation-id'],
              },
            },
          });
        } catch (e) {
          // Audit failure should never break the main flow
          console.error('Audit log failed:', e.message);
        }
      }),
    );
  }

  private resolveAction(method: string, path: string): string | null {
    if (method === 'POST' && path.includes('/workflows')) return 'workflow.created';
    if (method === 'POST' && path.includes('/versions')) return 'version.created';
    if (method === 'PATCH' && path.includes('/publish')) return 'workflow.published';
    if (method === 'POST' && path.includes('/instances')) return 'instance.created';
    if (method === 'PATCH' && path.includes('/cancel')) return 'instance.cancelled';
    if (method === 'POST' && path.includes('/decide')) return 'decision.made';
    if (method === 'POST' && path.includes('/users')) return 'user.created';
    return null;
  }

  private resolveEntityType(path: string): string {
    if (path.includes('/workflows') || path.includes('/versions')) return 'WorkflowVersion';
    if (path.includes('/instances')) return 'WorkflowInstance';
    if (path.includes('/step-executions') || path.includes('/decide')) return 'StepExecution';
    if (path.includes('/users')) return 'User';
    return 'Unknown';
  }
}
