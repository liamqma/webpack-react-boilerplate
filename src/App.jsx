import React, { Component } from 'react';
import { styled } from '@compiled/react';

const Button = styled.button`
  font-size: 10px;
  font-weight: 500;
  border-radius: 3px;
  border: 1px solid blue;
`;

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  render() {
    return (
      <div>
        <Button>Test</Button>
      </div>
    );
  }
}

export default App;
