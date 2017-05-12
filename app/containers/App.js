// @flow
import React, { Component } from 'react';
import type { Children } from 'react';
import { Link } from 'react-router';

import Title from 'grommet/components/Title';
import GApp from 'grommet/components/App';
import Sidebar from 'grommet/components/Sidebar';
import Box from 'grommet/components/Box';
import Split from 'grommet/components/Split';
import Anchor from 'grommet/components/Anchor';
import Menu from 'grommet/components/Menu';


export default class App extends Component {
  props: {
    children: Children
  };

  render() {
    return (
      <GApp>
        <Split flex="right">
          <Sidebar>
            <Menu
              direction="column" align="start" justify="between" size="small"
              primary
            >
              <Anchor path="/" label="Home" />
              <Anchor path="/status" label="Status" />
            </Menu>
          </Sidebar>
          <Box>
            {this.props.children}
          </Box>
        </Split>


      </GApp>

    );
  }
}
