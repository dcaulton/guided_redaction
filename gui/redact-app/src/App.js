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
      movie_url: '',
      frameset_hash: '',
      image_width: 100,
      image_height: 100,
      analyze_url: 'http://127.0.0.1:8000/analyze/',                            
      redact_url: 'http://127.0.0.1:8000/redact/',                              
      parse_movie_url: 'http://127.0.0.1:8000/parse/',
      frames: [],
      framesets: {},
    }
  }


  makeNewFrameFrameset(the_url) {
      let new_frameset = {
          "-1": {
              "images": [the_url]
          }
      }
      let new_frames = [the_url]
      let new_frameset_hash = '-1'
      return ([new_frameset, new_frames, new_frameset_hash])
  }

  handleSetImageUrl = (the_url) => {
    let create_frameset = false
    let new_frameset = {wasnt: 'initialized'}
    let new_frames = ['whatnot']
    let new_frameset_hash = 'none'
    if (!this.state.framesets) {
        create_frameset = true
        let yy = this.makeNewFrameFrameset(the_url) 
        new_frameset = yy[0]
        new_frames = yy[1] 
        new_frameset_hash = yy[2]
    } else {
        let the_hashes = Object.keys(this.state.framesets)
        for (let i=0; i < the_hashes.length; i++) {
            let frameset_hash = the_hashes[i]
            if (this.state.framesets[frameset_hash]['images'].includes(the_url)) {
                new_frameset_hash = frameset_hash
            }
        }
        if (new_frameset_hash === 'none') {
            create_frameset = true
            let yy = this.makeNewFrameFrameset(the_url) 
            new_frameset = yy[0]
            new_frames = yy[1] 
            new_frameset_hash = yy[2]
        }
    }
    var img = new Image();
    var app_this = this;
    if (create_frameset) {
        img.onload = function(){
            app_this.setState({
              image_url: the_url,
              image_width: this.width,
              image_height: this.height,
              frameset_hash: new_frameset_hash,
              framesets: new_frameset,
              frames: new_frames,
            });
        };
    } else {
        img.onload = function(){
            app_this.setState({
              image_url: the_url,
              image_width: this.width,
              image_height: this.height,
              frameset_hash: new_frameset_hash,
            });
        };
    }
    img.src = the_url;
  }

  handleSetMovieUrl = (the_url) => {
    this.setState({
      movie_url: the_url,
    });
  }

  handleSetFramesAndFramesets = (the_frames, the_framesets) => {
    this.setState({
      frames: the_frames,
      framesets: the_framesets,
    });
  }

  addRedactionToFrameset = (image_name, areas_to_redact) => {
    alert('adding redaction into to frameset')
    // TODO if there is no frameset (we're working on a single image), initialize frames and framesets here
    //          give that generated frameset an id of -1 to indicate what we're doing
  }

  getRedactionFromFrameset = (image_name) => {
    alert('getting redaction into from frameset')
  }

  render() {
    return (
      <Router>
        <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
        <ul className="navbar-nav mr-auto mt-2 mt-lg-0">
          <li className="nav-item">
            <Link className='nav-link' id='home_link' to='/'>RedactUI</Link>
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
                setMovieUrlCallback={this.handleSetMovieUrl}
                setImageUrlCallback={this.handleSetImageUrl}
              />
            </Route>
            <Route path='/movie_parser'>
              <MovieParserPanel 
                movie_url = {this.state.movie_url}
                frames={this.state.frames}
                framesets={this.state.framesets}
                setFramesAndFramesetsCallback={this.handleSetFramesAndFramesets}
                setImageUrlCallback={this.handleSetImageUrl}
                parse_movie_url = {this.state.parse_movie_url}
              />
            </Route>
            <Route path='/redactor'>
              <RedactionPanel 
                // DMC Push areas_to_redact down soon, it will live with the framesets object up here
                areas_to_redact = {this.state.areas_to_redact}
                mask_method = {this.state.mask_method}
                image_url = {this.state.image_url}
                image_width = {this.state.image_width}
                image_height = {this.state.image_height}
                analyze_url = {this.state.analyze_url}
                redact_url = {this.state.redact_url}
                addRedactionToFrameset={this.addRedactionToFrameset}
                getRedactionFromFrameset={this.getRedactionFromFrameset}
              />
            </Route>
          </Switch>
        </div>
      </Router>
    );
  }
}

export default App;
