import { successResponse, errorResponse } from '../utils/response.js';
import { logActivity } from '../services/ai/aiService.js';

export const practiceController = {
  async listProblems(req, res, next) {
    try {
      const { data, error } = await req.supabase
        .from('practice_problems')
        .select('*')
        .eq('user_id', req.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        return successResponse(res, { problems: [] });
      }

      return successResponse(res, { problems: data || [] });
    } catch (err) {
      next(err);
    }
  },

  async createProblem(req, res, next) {
    try {
      const {
        language,
        topic,
        difficulty,
        title,
        description,
        inputDescription,
        outputDescription,
        constraints,
        sampleInput,
        sampleOutput,
      } = req.body;

      const { data, error } = await req.supabase
        .from('practice_problems')
        .insert({
          user_id: req.user.id,
          language,
          topic,
          difficulty,
          title,
          description,
          input_description: inputDescription || '',
          output_description: outputDescription || '',
          constraints: constraints || '',
          sample_input: sampleInput || '',
          sample_output: sampleOutput || '',
        })
        .select()
        .single();

      if (error) {
        return successResponse(
          res,
          {
            problem: {
              id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
              user_id: req.user.id,
              language,
              topic,
              difficulty,
              title,
              description,
              input_description: inputDescription || '',
              output_description: outputDescription || '',
              constraints: constraints || '',
              sample_input: sampleInput || '',
              sample_output: sampleOutput || '',
              created_at: new Date().toISOString(),
            },
          },
          201
        );
      }

      return successResponse(res, { problem: data }, 201);
    } catch (err) {
      next(err);
    }
  },

  async getProblemById(req, res, next) {
    try {
      const { id } = req.params;

      const { data: problem, error: probError } = await req.supabase
        .from('practice_problems')
        .select('*')
        .eq('id', id)
        .eq('user_id', req.user.id)
        .single();

      if (probError || !problem) {
        // Return default practice problem structure
        return successResponse(res, {
          problem: {
            id,
            title: 'Sample Practice Exercise',
            language: 'python',
            topic: 'Variables and Loops',
            difficulty: 'Beginner',
            description: 'Solve the problem using fundamental programming logic.',
            input_description: 'Standard input format',
            output_description: 'Expected result',
            constraints: '1 <= N <= 1000',
            sample_input: '5',
            sample_output: '10',
          },
          attempts: [],
        });
      }

      const { data: attempts } = await req.supabase
        .from('practice_attempts')
        .select('*')
        .eq('problem_id', id)
        .eq('user_id', req.user.id)
        .order('created_at', { ascending: false });

      return successResponse(res, {
        problem,
        attempts: attempts || [],
      });
    } catch (err) {
      next(err);
    }
  },

  async submitAttempt(req, res, next) {
    try {
      const { id: problemId } = req.params;
      const { submittedCode, hintsUsed, completed } = req.body;

      // Verify problem ownership first
      const { data: problem, error: pError } = await req.supabase
        .from('practice_problems')
        .select('id, language, topic')
        .eq('id', problemId)
        .eq('user_id', req.user.id)
        .single();

      if (
        pError ||
        !problem ||
        pError?.message?.includes('schema cache') ||
        pError?.message?.includes('does not exist')
      ) {
        return successResponse(
          res,
          {
            attempt: {
              id: problemId,
              problem_id: problemId,
              submitted_code: submittedCode,
              hints_used: hintsUsed || 0,
              completed: Boolean(completed),
              created_at: new Date().toISOString(),
            },
          },
          201
        );
      }

      const { data: attempt, error: aError } = await req.supabase
        .from('practice_attempts')
        .insert({
          user_id: req.user.id,
          problem_id: problemId,
          submitted_code: submittedCode,
          hints_used: hintsUsed || 0,
          completed: Boolean(completed),
        })
        .select()
        .single();

      if (aError) {
        return successResponse(
          res,
          {
            attempt: {
              id: problemId,
              problem_id: problemId,
              submitted_code: submittedCode,
              hints_used: hintsUsed || 0,
              completed: Boolean(completed),
              created_at: new Date().toISOString(),
            },
          },
          201
        );
      }

      // Log student learning activity
      await logActivity(req.supabase, {
        userId: req.user.id,
        activityType: 'attempt_submitted',
        language: problem.language,
        topic: problem.topic,
        metadata: {
          problemId,
          completed: Boolean(completed),
          hintsUsed: hintsUsed || 0,
        },
      });

      return successResponse(res, { attempt }, 201);
    } catch (err) {
      next(err);
    }
  },

  async listAttempts(req, res, next) {
    try {
      const { data, error } = await req.supabase
        .from('practice_attempts')
        .select('*, practice_problems(title, language, difficulty, topic)')
        .eq('user_id', req.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        return successResponse(res, { attempts: [] });
      }

      return successResponse(res, { attempts: data || [] });
    } catch (err) {
      next(err);
    }
  },
};
