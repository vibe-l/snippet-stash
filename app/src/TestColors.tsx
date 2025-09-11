import React from 'react';

const TestColors = () => {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Color Test</h1>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded bg-background text-foreground">
          <h2 className="font-semibold">Background</h2>
          <p>Should be light pink (330 100% 98%)</p>
        </div>
        
        <div className="p-4 rounded bg-card text-card-foreground">
          <h2 className="font-semibold">Card</h2>
          <p>Should be light blue (200 100% 95%)</p>
        </div>
        
        <div className="p-4 rounded bg-primary text-primary-foreground">
          <h2 className="font-semibold">Primary</h2>
          <p>Should be light teal (180 100% 85%)</p>
        </div>
        
        <div className="p-4 rounded bg-secondary text-secondary-foreground">
          <h2 className="font-semibold">Secondary</h2>
          <p>Should be light yellow (60 100% 88%)</p>
        </div>
      </div>
      
      <div className="mt-6 p-4 bg-red-500 text-white rounded">
        <h2 className="font-semibold">Direct Tailwind Color</h2>
        <p>This should be red to verify Tailwind is working</p>
      </div>
    </div>
  );
};

export default TestColors;