/**
 * Preseason Rankings Collector
 * Collects preseason AP Poll rankings and recruiting data for Week 1 predictions
 */

import { storage } from './storage';

interface PreseasonRanking {
  teamId: number;
  team: string;
  conference: string;
  rank: number;
  points: number;
  firstPlaceVotes: number;
}

interface RecruitingClass {
  teamId: number;
  team: string;
  rank: number;
  points: number;
  avgRating: number;
}

export class PreseasonRankingsCollector {
  private static readonly CFBD_API_KEY = process.env.CFBD_API_KEY;
  private static readonly BASE_URL = 'https://api.collegefootballdata.com';

  /**
   * Collect preseason AP Poll rankings
   */
  static async collectPreseasonRankings(season: number = 2025): Promise<PreseasonRanking[]> {
    if (!this.CFBD_API_KEY) {
      console.log('⚠️ CFBD API key not found - using synthetic preseason rankings');
      return this.generateSyntheticRankings();
    }

    try {
      console.log(`📊 Collecting preseason rankings for ${season}...`);
      
      const response = await fetch(
        `${this.BASE_URL}/polls?year=${season}&week=0&seasonType=regular`,
        {
          headers: { 'Authorization': `Bearer ${this.CFBD_API_KEY}` }
        }
      );

      if (!response.ok) {
        console.log(`⚠️ CFBD API returned ${response.status} - using synthetic rankings`);
        return this.generateSyntheticRankings();
      }

      const pollData = await response.json();
      const apPoll = pollData.find((poll: any) => poll.poll === 'AP Top 25');
      
      if (!apPoll?.ranks) {
        console.log('⚠️ No AP Poll data found - using synthetic rankings');
        return this.generateSyntheticRankings();
      }

      const rankings: PreseasonRanking[] = apPoll.ranks.map((rank: any) => ({
        teamId: rank.school_id || 0,
        team: rank.school,
        conference: rank.conference || 'Unknown',
        rank: rank.rank,
        points: rank.points || 0,
        firstPlaceVotes: rank.first_place_votes || 0
      }));

      console.log(`✅ Collected ${rankings.length} preseason rankings`);
      return rankings;

    } catch (error) {
      console.error('Error collecting preseason rankings:', error);
      return this.generateSyntheticRankings();
    }
  }

  /**
   * Collect recruiting class rankings from previous year
   */
  static async collectRecruitingData(season: number = 2025): Promise<RecruitingClass[]> {
    if (!this.CFBD_API_KEY) {
      console.log('⚠️ CFBD API key not found - using synthetic recruiting data');
      return this.generateSyntheticRecruiting();
    }

    try {
      console.log(`🎯 Collecting recruiting data for ${season}...`);
      
      const response = await fetch(
        `${this.BASE_URL}/recruiting/teams?year=${season - 1}`,
        {
          headers: { 'Authorization': `Bearer ${this.CFBD_API_KEY}` }
        }
      );

      if (!response.ok) {
        console.log(`⚠️ CFBD API returned ${response.status} - using synthetic recruiting`);
        return this.generateSyntheticRecruiting();
      }

      const recruitingData = await response.json();
      
      const recruitingClasses: RecruitingClass[] = recruitingData.map((team: any, index: number) => ({
        teamId: team.team_id || 0,
        team: team.team,
        rank: index + 1,
        points: team.points || 0,
        avgRating: team.avg_rating || 0
      }));

      console.log(`✅ Collected ${recruitingClasses.length} recruiting classes`);
      return recruitingClasses;

    } catch (error) {
      console.error('Error collecting recruiting data:', error);
      return this.generateSyntheticRecruiting();
    }
  }

  /**
   * Update team preseason ratings based on rankings and recruiting
   */
  static async updatePreseasonTeamRatings(season: number = 2025): Promise<void> {
    console.log('🔄 Updating preseason team ratings...');
    
    const [rankings, recruiting] = await Promise.all([
      this.collectPreseasonRankings(season),
      this.collectRecruitingData(season)
    ]);

    const teams = await storage.getAllTeams();
    let updatedCount = 0;

    for (const team of teams) {
      try {
        // Find preseason ranking
        const ranking = rankings.find(r => 
          r.team.toLowerCase().includes(team.name.toLowerCase()) ||
          team.name.toLowerCase().includes(r.team.toLowerCase())
        );

        // Find recruiting class
        const recruitingClass = recruiting.find(r => 
          r.team.toLowerCase().includes(team.name.toLowerCase()) ||
          team.name.toLowerCase().includes(r.team.toLowerCase())
        );

        // Calculate preseason ratings
        const preseasonRating = this.calculatePreseasonRating(ranking, recruitingClass);
        
        // Update team with preseason data
        await storage.updateTeam(team.id, {
          rank: ranking?.rank || null,
          weeklyRank: ranking?.rank || null,
          recruitingClassRank: recruitingClass?.rank || null,
          avgRecruitRating: recruitingClass?.avgRating || 0,
          recruitingScore: recruitingClass?.points || 0,
          // Use preseason rating for initial analytics
          currentEloRating: preseasonRating.elo,
          momentumScore: preseasonRating.momentum,
          lastUpdated: new Date()
        });

        updatedCount++;
        
        if (ranking || recruitingClass) {
          console.log(`✅ Updated ${team.name}: Rank #${ranking?.rank || 'NR'}, Recruiting #${recruitingClass?.rank || 'N/A'}`);
        }

      } catch (error) {
        console.error(`Error updating ${team.name}:`, error);
      }
    }

    console.log(`🎯 Preseason ratings updated for ${updatedCount} teams`);
  }

  /**
   * Calculate preseason rating based on ranking and recruiting
   */
  private static calculatePreseasonRating(
    ranking?: PreseasonRanking, 
    recruiting?: RecruitingClass
  ): { elo: number; momentum: number } {
    // Base ELO rating
    let elo = 1500;
    let momentum = 50;

    // Ranking bonus
    if (ranking) {
      if (ranking.rank <= 5) {
        elo += 200;
        momentum += 30;
      } else if (ranking.rank <= 10) {
        elo += 150;
        momentum += 25;
      } else if (ranking.rank <= 15) {
        elo += 100;
        momentum += 20;
      } else if (ranking.rank <= 25) {
        elo += 50;
        momentum += 15;
      }
    }

    // Recruiting bonus
    if (recruiting) {
      if (recruiting.rank <= 10) {
        elo += 75;
        momentum += 15;
      } else if (recruiting.rank <= 25) {
        elo += 50;
        momentum += 10;
      } else if (recruiting.rank <= 50) {
        elo += 25;
        momentum += 5;
      }
    }

    return { elo, momentum };
  }

  /**
   * Generate synthetic rankings for development
   */
  private static generateSyntheticRankings(): PreseasonRanking[] {
    const topTeams = [
      'Georgia', 'Texas', 'Oregon', 'Penn State', 'Notre Dame',
      'Ohio State', 'Alabama', 'Michigan', 'USC', 'Clemson',
      'Florida State', 'Utah', 'Oklahoma', 'LSU', 'Tennessee',
      'North Carolina', 'Wisconsin', 'Miami', 'TCU', 'Washington'
    ];

    return topTeams.map((team, index) => ({
      teamId: 0,
      team,
      conference: 'Various',
      rank: index + 1,
      points: 1500 - (index * 50),
      firstPlaceVotes: index === 0 ? 62 : 0
    }));
  }

  /**
   * Generate synthetic recruiting data for development
   */
  private static generateSyntheticRecruiting(): RecruitingClass[] {
    const topRecruiters = [
      'Alabama', 'Georgia', 'Texas', 'Ohio State', 'Notre Dame',
      'LSU', 'Michigan', 'USC', 'Clemson', 'Florida',
      'Penn State', 'Texas A&M', 'Oklahoma', 'Auburn', 'Miami'
    ];

    return topRecruiters.map((team, index) => ({
      teamId: 0,
      team,
      rank: index + 1,
      points: 300 - (index * 15),
      avgRating: 4.0 - (index * 0.1)
    }));
  }

  /**
   * API endpoint to trigger preseason collection
   */
  static async triggerPreseasonCollection(season: number = 2025): Promise<{ 
    success: boolean; 
    message: string; 
    rankings: number; 
    recruiting: number; 
  }> {
    try {
      const [rankings, recruiting] = await Promise.all([
        this.collectPreseasonRankings(season),
        this.collectRecruitingData(season)
      ]);

      await this.updatePreseasonTeamRatings(season);

      return {
        success: true,
        message: `Preseason data collected for ${season}`,
        rankings: rankings.length,
        recruiting: recruiting.length
      };
    } catch (error) {
      console.error('Error in preseason collection:', error);
      return {
        success: false,
        message: `Failed to collect preseason data: ${error}`,
        rankings: 0,
        recruiting: 0
      };
    }
  }
}