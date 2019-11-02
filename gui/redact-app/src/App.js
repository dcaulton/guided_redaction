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
      mask_method: 'blur_7x7',                                                  
      image_url: '',
      movie_url: '',
      frameset_hash: '',
      image_width: 100,
      image_height: 100,
      analyze_url: 'http://127.0.0.1:8000/analyze/',                            
      redact_url: 'http://127.0.0.1:8000/redact/',                              
      parse_movie_url: 'http://127.0.0.1:8000/parse/',
      reassemble_movie_url: 'http://127.0.0.1:8000/reassemble/',
      frames: [],
      framesets: {},
    }
  }

  componentDidMount() {
    this.checkForInboundImageOrMovie()
  }

  checkForInboundImageOrMovie() {
    console.log('checking for inbound image')
    let vars = this.getUrlVars()
    console.log(vars)
    if (Object.keys(vars).includes('image_url')) {
        console.log('inbound image found')
        this.handleSetImageUrl(vars['image_url'])
        document.getElementById('redactor_link').click()
    } else if (Object.keys(vars).includes('movie_url')) {
        console.log('inbound movie found')
        this.handleSetMovieUrl(vars['movie_url'])
        document.getElementById('movie_parser_link').click()
    }
  }

  getUrlVars() {
      var vars = {};
      window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
          value = decodeURIComponent(value);
          vars[key] = value;
      });
      return vars;
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
      image_url: '',
      frames: [],
      framesets: {},
      frameset_hash: '',
    });
  }

  handleSetFramesAndFramesets = (the_frames, the_framesets) => {
    this.setState({
      frames: the_frames,
      framesets: the_framesets,
    });
  }

  addRedactionToFrameset = (areas_to_redact) => {
    let deepCopyFramesets = JSON.parse(JSON.stringify(this.state.framesets))
    deepCopyFramesets[this.state.frameset_hash]['areas_to_redact'] = areas_to_redact
    this.setState({
        framesets: deepCopyFramesets,
    })
  }

  getRedactionFromFrameset = (frameset_hash) => {
    if (!this.state.framesets || !this.state.frameset_hash) {
        return []
    }
    let the_hash = this.state.frameset_hash
    if (frameset_hash) {
      the_hash = frameset_hash
    } 
    let frameset = this.state.framesets[the_hash]
    let tk = Object.keys(frameset)
    if (tk.indexOf('areas_to_redact') > -1) {
        return frameset['areas_to_redact']
    } else {
        return []
    }
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
                getRedactionFromFrameset={this.getRedactionFromFrameset}
                reassembleMovieUrl={this.state.reassemble_movie_url}
              />
            </Route>
            <Route path='/redactor'>
              <RedactionPanel 
                mask_method = {this.state.mask_method}
                image_url = {this.state.image_url}
                image_width = {this.state.image_width}
                image_height = {this.state.image_height}
                analyze_url = {this.state.analyze_url}
                redact_url = {this.state.redact_url}
                framesets={this.state.framesets}
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
