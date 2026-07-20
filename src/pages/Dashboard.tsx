import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { ArrowRight, Activity, TrendingUp, Target, Brain, Database, Shield, Zap } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    {
      title: "In-Depth Performance Analysis",
      description: "Dive deep into your test results. Identify your weakest subjects and topics, understand your silly mistakes, and track your conceptual gaps with precision.",
      icon: Activity,
      color: "from-blue-400 to-cyan-400",
      image: "/assets/graph_analysis.jpg"
    },
    {
      title: "Granular Subject Tracking",
      description: "Don't just track scores. Tag questions down to the exact topic level for GATE CSE subjects like OS, DBMS, and TOC. See exactly where you need to focus your revision.",
      icon: Target,
      color: "from-purple-400 to-pink-400",
      image: "/assets/subject_tracking.jpg"
    },
    {
      title: "Continuous Growth Monitoring",
      description: "Watch your scores improve over time with smart insights. Our trend analysis helps you predict your performance and stay motivated throughout your journey.",
      icon: TrendingUp,
      color: "from-emerald-400 to-teal-400",
      image: "/assets/growth_monitoring.jpg"
    },
    {
      title: "Smart Review System",
      description: "Revisit your mistakes efficiently. Filter questions by status, tags, and topics. Focus only on the questions you need to master.",
      icon: Brain,
      color: "from-orange-400 to-amber-400",
      image: "/assets/review_system.jpg"
    }
  ];

  return (
    <div className="flex flex-col items-center w-full min-h-screen text-center space-y-24 pb-24 overflow-x-hidden">
      
      {/* Hero Section */}
      <div className="relative w-full flex flex-col items-center justify-center min-h-screen px-4">
        <div className="absolute inset-0 bg-gradient-to-b from-primary-500/10 via-transparent to-transparent pointer-events-none" />
        
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-5xl space-y-8 relative z-10"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel text-primary-300 text-sm font-semibold tracking-wide mb-6"
          >
            <Zap className="w-4 h-4 text-yellow-400" />
            Supercharge Your Preparation
          </motion.div>

          <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white via-surface-200 to-surface-500 leading-[1.1]">
            Master <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-indigo-500">GATE CSE</span> <br className="hidden sm:block" /> Like Never Before
          </h1>
          
          <p className="text-lg sm:text-xl md:text-2xl text-surface-400 max-w-3xl mx-auto leading-relaxed font-light px-2">
            An advanced testing dashboard built for serious aspirants. Analyze, track, and conquer every test series with unparalleled insights.
          </p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="pt-10 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 w-full px-4 sm:px-0"
          >
            <Button 
              size="lg" 
              onClick={() => navigate('/app/add-test')}
              className="w-full sm:w-auto h-14 sm:h-16 px-8 sm:px-10 text-lg sm:text-xl font-bold rounded-2xl bg-gradient-to-r from-primary-600 to-indigo-600 text-white shadow-[0_0_40px_-10px_rgba(99,102,241,0.5)] hover:shadow-[0_0_60px_-15px_rgba(99,102,241,0.7)] hover:scale-105 transition-all duration-300 group border border-white/10"
            >
              Start Analyzing
              <ArrowRight className="ml-3 w-5 h-5 sm:w-6 sm:h-6 group-hover:translate-x-2 transition-transform" />
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              onClick={() => navigate('/app/settings')}
              className="w-full sm:w-auto h-14 sm:h-16 px-8 sm:px-10 text-lg sm:text-xl font-semibold rounded-2xl glass-button text-surface-200 hover:text-white"
            >
              Configure Setup
            </Button>
          </motion.div>
        </motion.div>
      </div>

      {/* Alternating Features Section */}
      <div className="w-full max-w-6xl mx-auto px-6 space-y-32">
        {features.map((feature, idx) => {
          const isEven = idx % 2 === 0;
          return (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8 }}
              className={`flex flex-col ${isEven ? 'md:flex-row' : 'md:flex-row-reverse'} items-center gap-8 md:gap-16 lg:gap-20`}
            >
              <div className="flex-1 space-y-4 md:space-y-6 text-center md:text-left flex flex-col items-center md:items-start">
                <div className={`inline-flex items-center justify-center w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br ${feature.color} bg-opacity-10 backdrop-blur-md border border-white/10 shadow-lg`}>
                  <feature.icon className="w-7 h-7 md:w-8 md:h-8 text-white" />
                </div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white tracking-tight leading-tight">
                  {feature.title}
                </h2>
                <p className="text-base sm:text-lg md:text-xl text-surface-400 leading-relaxed max-w-lg md:max-w-none">
                  {feature.description}
                </p>
              </div>
              
              <div className="flex-1 w-full">
                <div className="relative group">
                  <div className={`absolute -inset-1 bg-gradient-to-r ${feature.color} rounded-[2rem] blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200`} />
                  <div className="relative h-80 rounded-[2rem] glass-card flex items-center justify-center overflow-hidden">
                    <img 
                      src={feature.image} 
                      alt={feature.title} 
                      className="w-full h-full object-cover rounded-[2rem] opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700 ease-in-out" 
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Data Security Section */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7 }}
        className="w-full max-w-4xl mx-auto mt-20 px-4"
      >
        <div className="glass-panel p-8 sm:p-10 md:p-16 rounded-3xl md:rounded-[3rem] relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-primary-600/10 to-purple-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          <div className="relative z-10 flex flex-col items-center text-center space-y-4 md:space-y-6">
            <div className="flex gap-4">
              <Database className="w-10 h-10 md:w-12 md:h-12 text-primary-400" />
              <Shield className="w-10 h-10 md:w-12 md:h-12 text-purple-400" />
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">Your Data, Your Control</h2>
            <p className="text-base md:text-lg text-surface-300 max-w-2xl">
              All your test data is securely stored locally on your device. Use our powerful backup tools to export and import your progress anytime, ensuring you never lose your hard work.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
