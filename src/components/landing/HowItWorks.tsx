import { useEffect, useRef } from 'react';

export default function HowItWorks() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const stepsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = stepsRef.current.findIndex(ref => ref === entry.target);
            if (index !== -1) {
              // Update progress indicators
              const indicators = document.querySelectorAll('.progress-indicator');
              indicators.forEach((indicator, i) => {
                if (i <= index) {
                  indicator.classList.add('bg-circa-green');
                } else {
                  indicator.classList.remove('bg-circa-green');
                }
              });
            }
          }
        });
      },
      {
        threshold: 0.5,
        rootMargin: '-100px'
      }
    );

    stepsRef.current.forEach(ref => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-4xl font-bold text-center mb-4">How Circa Works</h2>
        <p className="text-gray-600 text-center mb-16">
          Our streamlined process makes carbon accounting simple and intuitive
        </p>

        <div className="flex justify-center mb-12">
          <div className="flex gap-2">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className={`h-2 w-8 rounded-full transition-colors duration-500 progress-indicator ${i === 0 ? 'bg-circa-green' : 'bg-gray-200'}`}
              />
            ))}
          </div>
        </div>

        <div className="space-y-32">
          <div ref={el => stepsRef.current[0] = el} className="flex items-center gap-8">
            <div className="flex-1 text-right">
              <h3 className="text-2xl font-semibold mb-2">Upload Data</h3>
              <p className="text-gray-600">Simple drag & drop for all your emission sources</p>
            </div>
            <div className="w-16 h-16 rounded-full bg-circa-green/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-circa-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
          </div>

          <div ref={el => stepsRef.current[1] = el} className="flex items-center gap-8">
            <div className="w-16 h-16 rounded-full bg-circa-green/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-circa-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-semibold mb-2">Auto-Match</h3>
              <p className="text-gray-600">AI-powered emission factor matching</p>
            </div>
          </div>

          <div ref={el => stepsRef.current[2] = el} className="flex items-center gap-8">
            <div className="flex-1 text-right">
              <h3 className="text-2xl font-semibold mb-2">Instant Insights</h3>
              <p className="text-gray-600">Visualize your carbon footprint immediately</p>
            </div>
            <div className="w-16 h-16 rounded-full bg-circa-green/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-circa-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>

          <div ref={el => stepsRef.current[3] = el} className="flex items-center gap-8">
            <div className="w-16 h-16 rounded-full bg-circa-green/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-circa-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-semibold mb-2">Generate Reports</h3>
              <p className="text-gray-600">CDP, GRI, and custom formats in one click</p>
            </div>
          </div>
        </div>

        <div className="mt-16 text-center">
          <button className="bg-circa-green text-white px-6 py-3 rounded-lg font-medium hover:bg-circa-green/90 transition-colors">
            Upload Your Data Now
          </button>
        </div>
      </div>
    </section>
  );
} 