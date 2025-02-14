const delay = async time => new Promise(resolve => setTimeout(resolve, time));

const opposite_team = color => color === 'red' ? 'blue' : 'red';
