// A simple plugin for shadcn components
module.exports = function shadcnPlugin({ addBase }) {
  addBase({
    ':root': {
      '--radius': '0.5rem',
    },
  });
}; 