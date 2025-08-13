import { useState } from "react";
import { useQuery } from "@/lib/queryClient";
import { Link, useParams, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Calendar, Clock, Eye, User, ArrowLeft, Search, BookOpen, TrendingUp, Target, Brain } from "lucide-react";
import { motion } from "framer-motion";

interface BlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  author: string;
  category: string;
  tags: string[];
  featured_image_url?: string;
  published: boolean;
  featured: boolean;
  view_count: number;
  created_at: string;
  updated_at: string;
  published_at: string;
  seo_title?: string;
  seo_description?: string;
}

export default function Blog() {
  const [, setLocation] = useLocation();
  const params = useParams<{ slug?: string }>();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // If we have a slug, show single post
  if (params.slug) {
    return <SingleBlogPost slug={params.slug} />;
  }

  // Otherwise show blog list
  return <BlogList searchTerm={searchTerm} setSearchTerm={setSearchTerm} selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory} />;
}

function BlogList({
  searchTerm,
  setSearchTerm,
  selectedCategory,
  setSelectedCategory
}: {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
}) {
  const { data: posts = [], isLoading, error } = useQuery({
    queryKey: ["/api/blog/posts"],
    queryFn: async () => {
      const response = await fetch("/api/blog/posts");
      if (!response.ok) throw new Error("Failed to fetch posts");
      return response.json() as BlogPost[];
    }
  });

  const { data: featuredPosts = [] } = useQuery({
    queryKey: ["/api/blog/featured"],
    queryFn: async () => {
      const response = await fetch("/api/blog/featured");
      if (!response.ok) throw new Error("Failed to fetch featured posts");
      return response.json() as BlogPost[];
    }
  });

  // Filter posts based on search and category
  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         post.excerpt.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || post.category.toLowerCase() === selectedCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  // Get unique categories
  const categories = ["all", ...new Set(posts.map(post => post.category.toLowerCase()))];

  if (error) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading Blog</h1>
          <p className="text-gray-600">Unable to load blog posts. Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-900 to-blue-700 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h1 className="text-4xl md:text-5xl font-bold mb-4">Rick's Picks Blog</h1>
              <p className="text-xl md:text-2xl text-blue-200 mb-8 max-w-3xl mx-auto">
                Expert analysis, betting strategies, and comprehensive college football insights to give you the edge
              </p>
              <div className="flex items-center justify-center gap-6 text-blue-200">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  <span>Educational Content</span>
                </div>
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  <span>Betting Strategies</span>
                </div>
                <div className="flex items-center gap-2">
                  <Brain className="w-5 h-5" />
                  <span>Expert Analysis</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Search and Filter */}
      <section className="bg-white border-b">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search articles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {categories.map(category => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className="capitalize"
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Featured Posts */}
            {featuredPosts.length > 0 && searchTerm === "" && selectedCategory === "all" && (
              <section className="mb-12">
                <h2 className="text-2xl font-bold mb-6">Featured Articles</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {featuredPosts.map(post => (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ y: -5 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Card className="h-full hover:shadow-lg transition-shadow">
                        <CardHeader className="pb-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="secondary">{post.category}</Badge>
                            <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">Featured</Badge>
                          </div>
                          <CardTitle className="text-lg leading-tight">
                            <Link href={`/blog/${post.slug}`} className="hover:text-blue-600">
                              {post.title}
                            </Link>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <CardDescription className="mb-4">
                            {post.excerpt}
                          </CardDescription>
                          <div className="flex items-center justify-between text-sm text-gray-500">
                            <div className="flex items-center gap-4">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(post.publishedAt).toLocaleDateString()}
                              </span>
                              <span className="flex items-center gap-1">
                                <Eye className="w-3 h-3" />
                                {post.viewCount}
                              </span>
                            </div>
                            <Link href={`/blog/${post.slug}`}>
                              <Button size="sm" variant="ghost">Read More</Button>
                            </Link>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
                <Separator className="my-8" />
              </section>
            )}

            {/* All Posts */}
            <section>
              <h2 className="text-2xl font-bold mb-6">
                {searchTerm || selectedCategory !== "all" ? "Search Results" : "Latest Articles"}
                {filteredPosts.length > 0 && (
                  <span className="text-base font-normal text-gray-600 ml-2">
                    ({filteredPosts.length} {filteredPosts.length === 1 ? "article" : "articles"})
                  </span>
                )}
              </h2>

              {isLoading ? (
                <div className="grid grid-cols-1 gap-6">
                  {[...Array(3)].map((_, i) => (
                    <Card key={i} className="animate-pulse">
                      <CardHeader>
                        <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                        <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                      </CardHeader>
                      <CardContent>
                        <div className="h-4 bg-gray-200 rounded mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : filteredPosts.length === 0 ? (
                <div className="text-center py-12">
                  <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No articles found</h3>
                  <p className="text-gray-600 mb-4">
                    {searchTerm ? `No articles match "${searchTerm}"` : "No articles in this category"}
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm("");
                      setSelectedCategory("all");
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6">
                  {filteredPosts.map((post, index) => (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                    >
                      <Card className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="secondary">{post.category}</Badge>
                            {post.tags.slice(0, 2).map(tag => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                          <CardTitle className="text-xl">
                            <Link href={`/blog/${post.slug}`} className="hover:text-blue-600">
                              {post.title}
                            </Link>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <CardDescription className="mb-4 text-base">
                            {post.excerpt}
                          </CardDescription>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {post.author}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(post.publishedAt).toLocaleDateString()}
                              </span>
                              <span className="flex items-center gap-1">
                                <Eye className="w-3 h-3" />
                                {post.viewCount}
                              </span>
                            </div>
                            <Link href={`/blog/${post.slug}`}>
                              <Button size="sm">Read Article</Button>
                            </Link>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Categories */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Categories</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {categories.filter(cat => cat !== "all").map(category => {
                  const count = posts.filter(post => post.category.toLowerCase() === category.toLowerCase()).length;
                  return (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`w-full text-left px-3 py-2 rounded hover:bg-gray-100 transition-colors capitalize ${
                        selectedCategory === category ? 'bg-blue-50 text-blue-600' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{category}</span>
                        <span className="text-sm text-gray-500">{count}</span>
                      </div>
                    </button>
                  );
                })}
              </CardContent>
            </Card>

            {/* Popular Tags */}
            {posts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Popular Topics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {[...new Set(posts.flatMap(post => post.tags))].slice(0, 10).map(tag => (
                      <Badge key={tag} variant="secondary" className="text-xs cursor-pointer hover:bg-blue-100">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Newsletter Signup */}
            <Card className="bg-blue-50">
              <CardHeader>
                <CardTitle className="text-lg">Stay Updated</CardTitle>
                <CardDescription>
                  Get the latest college football analysis and betting insights delivered to your inbox.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Input placeholder="Your email address" type="email" />
                  <Button className="w-full">Subscribe</Button>
                  <p className="text-xs text-gray-500">
                    Weekly updates with our best analysis and picks.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function SingleBlogPost({ slug }: { slug: string }) {
  const [, setLocation] = useLocation();

  const { data: post, isLoading, error } = useQuery({
    queryKey: ["/api/blog", slug],
    queryFn: async () => {
      const response = await fetch(`/api/blog/${slug}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Post not found");
        }
        throw new Error("Failed to fetch post");
      }
      return response.json() as BlogPost;
    }
  });

  const { data: relatedPosts = [] } = useQuery({
    queryKey: ["/api/blog/posts"],
    queryFn: async () => {
      const response = await fetch("/api/blog/posts");
      if (!response.ok) return [];
      const posts = await response.json() as BlogPost[];
      return posts.filter(p => p.slug !== slug).slice(0, 3);
    }
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              <div className="h-4 bg-gray-200 rounded w-4/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            {error?.message === "Post not found" ? "Article Not Found" : "Error Loading Article"}
          </h1>
          <p className="text-gray-600 mb-8">
            {error?.message === "Post not found"
              ? "The article you're looking for doesn't exist or has been removed."
              : "Unable to load the article. Please try again later."
            }
          </p>
          <Button onClick={() => setLocation("/blog")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Blog
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <section className="bg-surface border-b border-border">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <nav className="mb-6">
              <Button
                variant="ghost"
                onClick={() => setLocation("/blog")}
                className="hover:bg-surface-light text-white"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Blog
              </Button>
            </nav>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Badge variant="secondary" className="bg-accent/20 text-accent">{post.category}</Badge>
                {post.featured && (
                  <Badge className="bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30">Featured</Badge>
                )}
                {post.tags.slice(0, 3).map(tag => (
                  <Badge key={tag} variant="outline" className="text-xs border-white/20 text-white/70">
                    {tag}
                  </Badge>
                ))}
              </div>

              <h1 className="text-3xl md:text-4xl font-bold mb-6 leading-tight text-white">
                {post.title}
              </h1>

              <div className="flex flex-wrap items-center gap-6 text-white/60 mb-6">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span>{post.author}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date(post.publishedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  <span>{post.viewCount} views</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{Math.ceil(post.content.length / 1000)} min read</span>
                </div>
              </div>

              <div className="text-lg text-white/80 leading-relaxed">
                {post.excerpt}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="bg-surface rounded-xl p-8 border border-border">
              <motion.article
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="prose prose-lg max-w-none prose-invert"
              >
                <div
                  className="text-white/90 leading-relaxed space-y-6 [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mt-8 [&_h1]:mb-6 [&_h1]:text-white [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mt-8 [&_h2]:mb-4 [&_h2]:text-white [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:mt-6 [&_h3]:mb-3 [&_h3]:text-white [&_h4]:text-lg [&_h4]:font-semibold [&_h4]:mt-4 [&_h4]:mb-2 [&_h4]:text-white [&_p]:mb-4 [&_p]:text-white/90 [&_ul]:mb-4 [&_ul]:pl-6 [&_li]:mb-2 [&_li]:text-white/90 [&_strong]:text-accent [&_em]:text-white/70 [&_code]:bg-surface-light [&_code]:px-2 [&_code]:py-1 [&_code]:rounded [&_code]:text-accent [&_blockquote]:border-l-4 [&_blockquote]:border-accent [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-white/80"
                  dangerouslySetInnerHTML={{
                    __html: post.content
                      // Convert line breaks to paragraphs
                      .split('\n\n').map(paragraph => paragraph.trim()).filter(p => p.length > 0)
                      .map(paragraph => {
                        // Handle headers
                        if (paragraph.startsWith('# ')) {
                          return `<h1>${paragraph.substring(2)}</h1>`;
                        } else if (paragraph.startsWith('## ')) {
                          return `<h2>${paragraph.substring(3)}</h2>`;
                        } else if (paragraph.startsWith('### ')) {
                          return `<h3>${paragraph.substring(4)}</h3>`;
                        } else if (paragraph.startsWith('#### ')) {
                          return `<h4>${paragraph.substring(5)}</h4>`;
                        } else {
                          // Handle regular paragraphs
                          return `<p>${paragraph
                            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                            .replace(/\*(.*?)\*/g, '<em>$1</em>')
                            .replace(/`(.*?)`/g, '<code>$1</code>')
                            .replace(/\n/g, '<br>')
                          }</p>`;
                        }
                      }).join('')
                  }}
                />
              </motion.article>
            </div>
          </div>
        </div>
      </section>

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <section className="bg-surface border-t border-border py-12">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-bold mb-8 text-white">Related Articles</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {relatedPosts.map(relatedPost => (
                  <Card key={relatedPost.id} className="bg-surface-light border-border hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-4">
                      <Badge variant="secondary" className="w-fit bg-accent/20 text-accent">{relatedPost.category}</Badge>
                      <CardTitle className="text-lg leading-tight text-white">
                        <Link href={`/blog/${relatedPost.slug}`} className="hover:text-accent transition-colors">
                          {relatedPost.title}
                        </Link>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="mb-4 text-white/70">
                        {relatedPost.excerpt.slice(0, 120)}...
                      </CardDescription>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-white/50">
                          {new Date(relatedPost.publishedAt).toLocaleDateString()}
                        </span>
                        <Link href={`/blog/${relatedPost.slug}`}>
                          <Button size="sm" variant="ghost" className="text-accent hover:bg-accent/20">Read More</Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}