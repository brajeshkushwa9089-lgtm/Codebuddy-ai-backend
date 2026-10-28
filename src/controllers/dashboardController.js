import { successResponse, errorResponse } from '../utils/response.js';

export const dashboardController = {
  async getStats(req, res, next) {
    try {
      const userId = req.user.id;

      // Default safe empty stats
      const defaultStats = {
        totalAttempts: 0,
        problemsCompleted: 0,
        questionsAsked: 0,
        learningStreak: 0,
        languageStats: [],
        recentTopics: [],
        chartData: [
          { date: 'Mon', day: 'Mon', activities: 0 },
          { date: 'Tue', day: 'Tue', activities: 0 },
          { date: 'Wed', day: 'Wed', activities: 0 },
          { date: 'Thu', day: 'Thu', activities: 0 },
          { date: 'Fri', day: 'Fri', activities: 0 },
          { date: 'Sat', day: 'Sat', activities: 0 },
          { date: 'Sun', day: 'Sun', activities: 0 },
        ],
        suggestedNextTopics: [
          'Variables and Data Types',
          'Conditional Statements',
          'Loops & Iteration',
          'Functions & Scope',
        ],
        isEmptyState: true,
        isDbPending: false,
      };

      // 1. Total practice attempts and completed count
      const { data: attempts, error: attError } = await req.supabase
        .from('practice_attempts')
        .select('id, completed, hints_used, created_at')
        .eq('user_id', userId);

      // If tables don't exist yet in Supabase, return default stats gracefully
      if (
        attError &&
        (attError.message?.includes('schema cache') ||
          attError.message?.includes('does not exist') ||
          attError.code === '42P01')
      ) {
        return successResponse(res, {
          stats: {
            ...defaultStats,
            isDbPending: true,
          },
        });
      }

      const totalAttempts = attempts?.length || 0;
      const problemsCompleted = attempts?.filter((a) => a.completed).length || 0;

      // 2. Questions asked (count of user messages across student's conversations)
      let questionsAsked = 0;
      try {
        const { data: conversations } = await req.supabase
          .from('conversations')
          .select('id')
          .eq('user_id', userId);

        if (conversations && conversations.length > 0) {
          const convoIds = conversations.map((c) => c.id);
          const { count, error: countError } = await req.supabase
            .from('conversation_messages')
            .select('id', { count: 'exact', head: true })
            .in('conversation_id', convoIds)
            .eq('role', 'user');

          if (!countError) {
            questionsAsked = count || 0;
          }
        }
      } catch {
        // non-blocking
      }

      // 3. Learning activity aggregation (Languages, Topics, and Streak)
      const { data: activities } = await req.supabase
        .from('learning_activity')
        .select('activity_type, language, topic, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      // Language distribution breakdown
      const languageCounts = {};
      const uniqueTopics = new Set();
      const activityDates = new Set();

      (activities || []).forEach((act) => {
        if (act.language && act.language !== 'general') {
          languageCounts[act.language] = (languageCounts[act.language] || 0) + 1;
        }
        if (act.topic) {
          uniqueTopics.add(act.topic);
        }
        if (act.created_at) {
          const dateStr = new Date(act.created_at).toISOString().split('T')[0];
          activityDates.add(dateStr);
        }
      });

      const languageStats = Object.entries(languageCounts).map(([lang, count]) => ({
        language: lang,
        count,
      }));

      // Calculate learning streak
      let streak = 0;
      const today = new Date();
      let checkDate = new Date(today);

      while (true) {
        const dateStr = checkDate.toISOString().split('T')[0];
        if (activityDates.has(dateStr)) {
          streak += 1;
          checkDate.setDate(checkDate.getDate() - 1);
        } else if (streak === 0) {
          checkDate.setDate(checkDate.getDate() - 1);
          const yesterdayStr = checkDate.toISOString().split('T')[0];
          if (activityDates.has(yesterdayStr)) {
            streak += 1;
            checkDate.setDate(checkDate.getDate() - 1);
          } else {
            break;
          }
        } else {
          break;
        }
      }

      // Activity timeline for past 7 days (chart data)
      const last7Days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dayStr = d.toISOString().split('T')[0];
        const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });
        const dayCount = (activities || []).filter(
          (a) => a.created_at && a.created_at.startsWith(dayStr)
        ).length;

        last7Days.push({
          date: dayStr,
          day: dayLabel,
          activities: dayCount,
        });
      }

      const allSuggestedTopics = [
        'Variables and Data Types',
        'Conditional Statements',
        'Loops & Iteration',
        'Functions & Scope',
        'Arrays & Lists',
        'String Manipulation',
        'Recursion & Call Stack',
        'Pointers & Memory (C/C++)',
      ];
      const suggestedNextTopics = allSuggestedTopics.filter((t) => !uniqueTopics.has(t)).slice(0, 4);

      return successResponse(res, {
        stats: {
          totalAttempts,
          problemsCompleted,
          questionsAsked,
          learningStreak: streak,
          languageStats,
          recentTopics: Array.from(uniqueTopics).slice(0, 6),
          chartData: last7Days,
          suggestedNextTopics,
          isEmptyState: totalAttempts === 0 && questionsAsked === 0 && (activities?.length || 0) === 0,
          isDbPending: false,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  async getActivity(req, res, next) {
    try {
      const { data, error } = await req.supabase
        .from('learning_activity')
        .select('*')
        .eq('user_id', req.user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        return successResponse(res, { activity: [] });
      }

      return successResponse(res, { activity: data || [] });
    } catch (err) {
      next(err);
    }
  },
};
