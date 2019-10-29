import React from 'react';
import RedactionPanel from './components/RedactionPanel';
import MovieParserPanel from './components/MovieParserPanel';
import HomePanel from './components/HomePanel';
import './App.css';
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Link
} from "react-router-dom";

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      areas_to_redact: [],                                                                        
      mask_method: 'blur_7x7',                                                  
      image_path: 'images/frame_00187.png',                                     
      image_url: 'http://127.0.0.1:3000/images/frame_00187.png',                
      analyze_url: 'http://127.0.0.1:8000/analyze/',                            
      redact_url: 'http://127.0.0.1:8000/redact/',                              
    }
  }

  render() {
    return (
      <Router>
        <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
        <a class="navbar-brand" href="/">RedactUI</a>
        <ul class="navbar-nav mr-auto mt-2 mt-lg-0">
          <li class="nav-item">
            <Link className='nav-link' to='/movie_parser'>Movie Parser</Link>
          </li>
          <li class="nav-item">
            <Link className='nav-link' to='/redactor'>Image Redactor</Link>
          </li>
        </ul>
        </nav>
        <div id='container' className='App container'>
          <Switch>
            <Route exact path='/'>
              <HomePanel />
            </Route>
            <Route path='/movie_parser'>
              <MovieParserPanel />
            </Route>
            <Route path='/redactor'>
              <RedactionPanel 
                areas_to_redact = {this.state.areas_to_redact}
                mask_method = {this.state.mask_method}
                image_path = {this.state.image_path}
                image_url = {this.state.image_url}
                analyze_url = {this.state.analyze_url}
                redact_url = {this.state.redact_url}
              />
            </Route>
          </Switch>
        </div>
      </Router>
    );
  }
}

export default App;
