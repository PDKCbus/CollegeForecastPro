import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Share2, Twitter, Facebook, MessageCircle, Copy, Download, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { GameWithTeams } from '@/lib/types';

interface SocialShareProps {
  game: GameWithTeams;
  prediction?: {
    spreadPick?: string;
    overUnderPick?: string;
    confidence?: number;
  };
  ricksPick?: {
    spreadPick?: string;
    overUnderPick?: string;
  };
}

export function SocialShare({ game, prediction, ricksPick }: SocialShareProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const { toast } = useToast();

  const generateShareText = () => {
    const homeTeam = game.homeTeam?.name || 'Home Team';
    const awayTeam = game.awayTeam?.name || 'Away Team';
    const gameDate = new Date(game.startDate).toLocaleDateString();
    
    let shareText = `🏈 ${awayTeam} @ ${homeTeam} - ${gameDate}\n\n`;
    
    if (ricksPick?.spreadPick || ricksPick?.overUnderPick) {
      shareText += "🤓 Rick's Pick:\n";
      if (ricksPick.spreadPick) shareText += `Spread: ${ricksPick.spreadPick}\n`;
      if (ricksPick.overUnderPick) shareText += `Total: ${ricksPick.overUnderPick}\n`;
    } else if (prediction) {
      shareText += "🤓 ANALYSIS PICK:\n";
      if (prediction.spreadPick) shareText += `Spread: ${prediction.spreadPick}\n`;
      if (prediction.overUnderPick) shareText += `Total: ${prediction.overUnderPick}\n`;
      if (prediction.confidence) shareText += `Confidence: ${prediction.confidence}%\n`;
    }
    
    shareText += "\n#CollegeFootball #BettingPicks #RicksPicks";
    return shareText;
  };

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const shareText = generateShareText();

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`);
      toast({
        title: "Copied!",
        description: "Share text copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleTwitterShare = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(twitterUrl, '_blank', 'noopener,noreferrer');
  };

  const handleFacebookShare = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`;
    window.open(facebookUrl, '_blank', 'noopener,noreferrer');
  };

  const handleRedditShare = () => {
    const gameUrl = `${window.location.origin}/game-analysis?game=${game.id}`;
    const title = `${game.awayTeam?.name} @ ${game.homeTeam?.name} - Rick's Picks`;
    const redditUrl = `https://reddit.com/submit?url=${encodeURIComponent(gameUrl)}&title=${encodeURIComponent(title)}&text=${encodeURIComponent(shareText)}`;
    window.open(redditUrl, '_blank', 'noopener,noreferrer');
  };

  const handleCopyGameLink = async () => {
    const gameUrl = `${window.location.origin}/game-analysis?game=${game.id}`;
    try {
      await navigator.clipboard.writeText(gameUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
      toast({
        title: "Link copied!",
        description: "Game analysis link has been copied to your clipboard.",
        duration: 3000,
      });
    } catch (error) {
      // Fallback for browsers without clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = gameUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
      
      toast({
        title: "Link copied!",
        description: "Game analysis link has been copied to your clipboard.",
        duration: 3000,
      });
    }
  };

  const handleWhatsAppShare = () => {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText}\n\n${shareUrl}`)}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  const handleDownloadImage = () => {
    // Generate and download a preview image
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 800;
    canvas.height = 600;

    // Background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Rick\'s Picks', canvas.width / 2, 60);

    // Game info
    ctx.font = '24px Arial';
    const homeTeam = game.homeTeam?.name || 'Home Team';
    const awayTeam = game.awayTeam?.name || 'Away Team';
    ctx.fillText(`${awayTeam} @ ${homeTeam}`, canvas.width / 2, 120);

    // Date
    ctx.font = '18px Arial';
    ctx.fillStyle = '#888888';
    const gameDate = new Date(game.startDate).toLocaleDateString();
    ctx.fillText(gameDate, canvas.width / 2, 150);

    // Picks
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 20px Arial';
    let yPosition = 220;

    if (ricksPick?.spreadPick || ricksPick?.overUnderPick) {
      ctx.fillText('Rick\'s Pick:', canvas.width / 2, yPosition);
      yPosition += 40;
      
      if (ricksPick.spreadPick) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '18px Arial';
        ctx.fillText(`Spread: ${ricksPick.spreadPick}`, canvas.width / 2, yPosition);
        yPosition += 30;
      }
      
      if (ricksPick.overUnderPick) {
        ctx.fillText(`Total: ${ricksPick.overUnderPick}`, canvas.width / 2, yPosition);
        yPosition += 30;
      }
    } else if (prediction) {
      ctx.fillText('Analysis Pick:', canvas.width / 2, yPosition);
      yPosition += 40;
      
      if (prediction.spreadPick) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '18px Arial';
        ctx.fillText(`Spread: ${prediction.spreadPick}`, canvas.width / 2, yPosition);
        yPosition += 30;
      }
      
      if (prediction.overUnderPick) {
        ctx.fillText(`Total: ${prediction.overUnderPick}`, canvas.width / 2, yPosition);
        yPosition += 30;
      }
      
      if (prediction.confidence) {
        ctx.fillText(`Confidence: ${prediction.confidence}%`, canvas.width / 2, yPosition);
      }
    }

    // Footer
    ctx.fillStyle = '#888888';
    ctx.font = '14px Arial';
    ctx.fillText('rickiespicks.com', canvas.width / 2, canvas.height - 30);

    // Download
    const link = document.createElement('a');
    const homeTeamName = game.homeTeam?.name || 'Home';
    const awayTeamName = game.awayTeam?.name || 'Away';
    link.download = `ricks-picks-${awayTeamName}-${homeTeamName}.png`.replace(/[^a-z0-9.-]/gi, '-');
    link.href = canvas.toDataURL();
    link.click();

    toast({
      title: "Downloaded!",
      description: "Share image saved to downloads",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full flex items-center gap-2">
          <Share2 className="h-4 w-4" />
          Share Pick
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" aria-describedby="share-dialog-description">
        <DialogHeader>
          <DialogTitle>Share Your Pick</DialogTitle>
        </DialogHeader>
        <div id="share-dialog-description" className="sr-only">
          Share your betting pick on social media platforms
        </div>
        
        {/* Preview Card */}
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="text-center space-y-2">
              <div className="text-lg font-bold">
                {game.awayTeam?.name} @ {game.homeTeam?.name}
              </div>
              <div className="text-sm text-muted-foreground">
                {new Date(game.startDate).toLocaleDateString()}
              </div>
              
              {(ricksPick?.spreadPick || ricksPick?.overUnderPick) && (
                <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg">
                  <div className="font-semibold text-green-700 dark:text-green-300">
                    Rick's Pick:
                  </div>
                  {ricksPick.spreadPick && (
                    <div className="text-sm">Spread: {ricksPick.spreadPick}</div>
                  )}
                  {ricksPick.overUnderPick && (
                    <div className="text-sm">Total: {ricksPick.overUnderPick}</div>
                  )}
                </div>
              )}
              
              {prediction && !ricksPick?.spreadPick && !ricksPick?.overUnderPick && (
                <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
                  <div className="font-semibold text-blue-700 dark:text-blue-300">
                    🤓 ANALYSIS PICK:
                  </div>
                  {prediction.spreadPick && (
                    <div className="text-sm">Spread: {prediction.spreadPick}</div>
                  )}
                  {prediction.overUnderPick && (
                    <div className="text-sm">Total: {prediction.overUnderPick}</div>
                  )}
                  {prediction.confidence && (
                    <div className="text-sm">Confidence: {prediction.confidence}%</div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Share Options */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={handleTwitterShare}
          >
            <Twitter className="h-4 w-4" />
            Twitter
          </Button>
          
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={handleFacebookShare}
          >
            <Facebook className="h-4 w-4" />
            Facebook
          </Button>
          
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={handleRedditShare}
          >
            <MessageCircle className="h-4 w-4" />
            Reddit
          </Button>
          
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={handleCopyGameLink}
          >
            {linkCopied ? (
              <>
                <Check className="h-4 w-4 text-green-500" />
                Link Copied!
              </>
            ) : (
              <>
                <Share2 className="h-4 w-4" />
                Copy Link
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}