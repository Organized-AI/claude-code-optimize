import { Router } from 'express';
import { SessionTemplatesService } from '../services/SessionTemplatesService.js';
import { ExtendedSessionManager } from '../services/ExtendedSessionManager.js';
import { WebSocketManager } from '../services/WebSocketManager.js';

export function createTemplatesRouter(
  sessionManager: ExtendedSessionManager,
  wsManager: WebSocketManager
): Router {
  const router = Router();
  const templatesService = new SessionTemplatesService(sessionManager, wsManager);
  
  // Get all templates
  router.get('/templates', async (req, res) => {
    try {
      const templates = await templatesService.getAllTemplates();
      res.json(templates);
    } catch (error) {
      console.error('Error getting templates:', error);
      res.status(500).json({ 
        error: 'Failed to get templates',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Get a specific template
  router.get('/templates/:templateId', async (req, res) => {
    try {
      const { templateId } = req.params;
      const template = await templatesService.getTemplate(templateId);
      
      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }
      
      res.json(template);
    } catch (error) {
      console.error('Error getting template:', error);
      res.status(500).json({ 
        error: 'Failed to get template',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Create custom template
  router.post('/templates', async (req, res) => {
    try {
      const template = await templatesService.createCustomTemplate(req.body);
      res.status(201).json(template);
    } catch (error) {
      console.error('Error creating template:', error);
      res.status(500).json({ 
        error: 'Failed to create template',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Update template
  router.put('/templates/:templateId', async (req, res) => {
    try {
      const { templateId } = req.params;
      const updated = await templatesService.updateTemplate(templateId, req.body);
      
      if (!updated) {
        return res.status(404).json({ error: 'Template not found or not customizable' });
      }
      
      res.json(updated);
    } catch (error) {
      console.error('Error updating template:', error);
      res.status(500).json({ 
        error: 'Failed to update template',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Delete template
  router.delete('/templates/:templateId', async (req, res) => {
    try {
      const { templateId } = req.params;
      const deleted = await templatesService.deleteTemplate(templateId);
      
      if (!deleted) {
        return res.status(404).json({ error: 'Template not found or not deletable' });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting template:', error);
      res.status(500).json({ 
        error: 'Failed to delete template',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Apply template to session
  router.post('/sessions/:sessionId/apply-template', async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { templateId } = req.body;
      
      if (!templateId) {
        return res.status(400).json({ error: 'Template ID required' });
      }
      
      const updatedSession = await templatesService.applyTemplate(sessionId, templateId);
      
      if (!updatedSession) {
        return res.status(404).json({ error: 'Session or template not found' });
      }
      
      res.json(updatedSession);
    } catch (error) {
      console.error('Error applying template:', error);
      res.status(500).json({ 
        error: 'Failed to apply template',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Get current phase for session
  router.get('/sessions/:sessionId/current-phase', async (req, res) => {
    try {
      const { sessionId } = req.params;
      const phase = await templatesService.getCurrentPhase(sessionId);
      
      if (!phase) {
        return res.status(404).json({ error: 'No phase found for session' });
      }
      
      res.json(phase);
    } catch (error) {
      console.error('Error getting current phase:', error);
      res.status(500).json({ 
        error: 'Failed to get current phase',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Complete a phase
  router.post('/sessions/:sessionId/phases/:phaseId/complete', async (req, res) => {
    try {
      const { sessionId, phaseId } = req.params;
      await templatesService.completePhase(sessionId, phaseId);
      res.status(204).send();
    } catch (error) {
      console.error('Error completing phase:', error);
      res.status(500).json({ 
        error: 'Failed to complete phase',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  return router;
}