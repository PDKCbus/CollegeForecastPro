import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface PageBannerProps {
  title: string;
  subtitle: string;
  features?: {
    icon: LucideIcon;
    text: string;
  }[];
}

export function PageBanner({ title, subtitle, features }: PageBannerProps) {
  return (
    <section className="bg-gradient-to-r from-blue-900 to-blue-700 text-white py-16">
      <div className="container mx-auto px-4">
        <div className="text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4">{title}</h1>
            <p className="text-xl md:text-2xl text-blue-200 mb-8 max-w-3xl mx-auto">
              {subtitle}
            </p>
            {features && features.length > 0 && (
              <div className="flex items-center justify-center gap-6 text-blue-200 flex-wrap">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <feature.icon className="w-5 h-5" />
                    <span>{feature.text}</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}