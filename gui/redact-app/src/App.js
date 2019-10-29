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
      image_url: '',
      image_width: 100,
      image_height: 100,
      analyze_url: 'http://127.0.0.1:8000/analyze/',                            
      redact_url: 'http://127.0.0.1:8000/redact/',                              
    }
  }

  handleSetImageUrl = (the_url) => {
    var img = new Image();
    var app_this = this;
    img.onload = function(){
        app_this.setState({
          image_url: the_url,
          image_width: this.width,
          image_height: this.height,
        });
    };
    img.src = the_url;
  }

  render() {
    return (
      <Router>
        <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
        <ul className="navbar-nav mr-auto mt-2 mt-lg-0">
          <li className="nav-item">
            <Link className='nav-link' id='home_parser_link' to='/'>RedactUI</Link>
          </li>
          <li className="nav-item">
            <Link className='nav-link' id='movie_parser_link' to='/movie_parser'>Movie Parser</Link>
          </li>
          <li className="nav-item">
            <Link className='nav-link' id='redactor_link' to='/redactor'>Image Redactor</Link>
          </li>
        </ul>
        </nav>
        <div id='container' className='App container'>
          <Switch>
            <Route exact path='/'>
              <HomePanel 
                setImageUrlCallback={this.handleSetImageUrl}
              />
            </Route>
            <Route path='/movie_parser'>
              <MovieParserPanel />
            </Route>
            <Route path='/redactor'>
              <RedactionPanel 
                areas_to_redact = {this.state.areas_to_redact}
                mask_method = {this.state.mask_method}
                image_url = {this.state.image_url}
                image_width = {this.state.image_width}
                image_height = {this.state.image_height}
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
