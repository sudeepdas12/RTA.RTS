const React = require('react');

const MockChart = (props) => {
  return React.createElement('div', { 'data-mock-chart': true }, props.children || null);
};

module.exports = {
  Bar: MockChart,
  Doughnut: MockChart,
  Line: MockChart,
  Pie: MockChart,
  PolarArea: MockChart,
  Radar: MockChart,
  Chart: MockChart,
};
