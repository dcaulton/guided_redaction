import React from 'react';
import {FrameCardList, FramesetCardList} from './FramesFramesets'

class MoviePanel extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      frame_frameset_view_mode: 'frameset',
      frame_button_classes: 'btn btn-primary',
      frame_button_text : 'Show Frames',
      frameset_button_classes: 'btn btn-secondary',
      frameset_button_text: 'Displaying all Framesets',
      reassembling_video: false,
      draggedId: null,
      zoom_image_url: '',
    }
    this.toggleFrameFramesetCallback = this.toggleFrameFramesetCallback.bind(this)
    this.getNameFor = this.getNameFor.bind(this)
    this.redactFramesetCallback = this.redactFramesetCallback.bind(this)
    this.callMovieSplit = this.callMovieSplit.bind(this)
    this.setDraggedId = this.setDraggedId.bind(this)
    this.setZoomImageUrl= this.setZoomImageUrl.bind(this)
    this.handleDroppedFrameset = this.handleDroppedFrameset.bind(this)
    this.allFramesHaveBeenRedacted = this.allFramesHaveBeenRedacted.bind(this)
  }

  setDraggedId = (the_id) => {
    this.setState({
      draggedId: the_id,
    })
  }

  handleDroppedFrameset = (target_id) => {
    this.props.handleMergeFramesets(target_id, this.state.draggedId)
  }

  movieSplitWhenDone() {
    document.getElementById('movieparser_status').innerHTML = 'movie unzipping completed'
    document.getElementById('frameset_button').disabled = true;
    document.getElementById('frame_button').disabled = false;
    document.getElementById('frame_cards').style.display = 'none';
    document.getElementById('frameset_cards').style.display = 'block';
    document.getElementById('parse_video_button').disabled = true;
    document.getElementById('parse_video_button').innerHTML = 'Movie Parse Called'
  }

  callMovieSplit() {
    this.props.doMovieSplit(this.movieSplitWhenDone)
  }

  async callRedactOnOneFrame(areas_to_redact_short, image_url) {
    let the_body = {
      areas_to_redact: areas_to_redact_short,
      mask_method: this.props.mask_method,
      image_url: image_url,
      return_type: 'url',
    }
    fetch(this.props.redact_url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(the_body),
    })
    .then((response) => response.json())
    .then((responseJson) => {
      let local_framesets = JSON.parse(JSON.stringify(this.props.framesets));
      let frameset_hash = this.props.getFramesetHashForImageUrl(responseJson['original_image_url'])
      let frameset = local_framesets[frameset_hash]
      frameset['redacted_image'] = responseJson['redacted_image_url']
      local_framesets[frameset_hash] = frameset
      this.props.handleUpdateFramesetCallback(frameset_hash, frameset)
    })
    .then(() => {
      if (this.allFramesHaveBeenRedacted()) {
        this.zipUpRedactedImages()
      }
    })
    .catch((error) => {
      console.error(error);
    })
  }

  getRedactedMovieFilename() {
    //TODO this is not friendly to file names with more than one period, or with a slash in them
    let parts = this.props.movie_url.split('/')
    let file_parts = parts[parts.length-1].split('.')
    let new_filename = file_parts[0] + '_redacted.' + file_parts[1]
    return new_filename
  }

  allFramesHaveBeenRedacted() {
    const framesets = this.props.framesets
    const keys = Object.keys(framesets)
    for (let i=0; i < keys.length; i++) {
      const key = keys[i]
      if (framesets[key]['areas_to_redact']) {
        if (framesets[key]['areas_to_redact'].length > 0) {
          if (!framesets[key]['redacted_image']) {
            return false
          }
        }
      }
    }
    return true
  }

  zipUpRedactedImages() {
    let framesets = this.props.framesets
    let movie_frame_urls = []
    for (let i=0; i < this.props.frames.length; i++) {
      let image_url = this.props.frames[i]
      let the_hash = this.props.getFramesetHashForImageUrl(image_url)
      let the_frameset = framesets[the_hash]
      if (('areas_to_redact' in the_frameset) && the_frameset['areas_to_redact'].length > 0) {
        movie_frame_urls.push(the_frameset['redacted_image'])
      } else {
        movie_frame_urls.push(image_url)
      }
    }
    this.callMovieZip(movie_frame_urls)
  }

  async callMovieZip(the_urls) {
    document.getElementById('movieparser_status').innerHTML = 'calling movie zipper'
    let new_movie_name = this.getRedactedMovieFilename()
    await fetch(this.props.zipMovieUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_urls: the_urls,
        movie_name: new_movie_name,
      }),
    })
    .then((response) => response.json())
    .then((responseJson) => {
      let movie_url = responseJson['movie_url']
      this.props.setRedactedMovieUrlCallback(movie_url)
    })
    .catch((error) => {
      console.error(error);
    });
    document.getElementById('movieparser_status').innerHTML = 'movie zipping completed'
  }

  redactFramesetCallback = (frameset_hash) => {
    let first_image_url = this.props.framesets[frameset_hash]['images'][0]
    this.props.setImageUrlCallback(first_image_url)
    const link_to_next_page = document.getElementById('image_panel_link')
    link_to_next_page.click()
  }

  imageUrlHasRedactionInfo = (image_url) => {
    let frameset_hash = this.props.getFramesetHashForImageUrl(image_url)
    let areas_to_redact = this.props.getRedactionFromFrameset(frameset_hash)
    if (areas_to_redact.length > 0) {
        return true
    }
    return false
  }

  callFrameRedactions() {
    this.setState({reassembling_video: true})
    document.getElementById('movieparser_status').innerHTML = 'calling movie reassembler'
    let frameset_keys = Object.keys(this.props.framesets)
    for (let i=0; i < frameset_keys.length; i++) {
      let pass_arr = []
      let hash_key = frameset_keys[i]
      const areas_to_redact = this.props.getRedactionFromFrameset(hash_key)
      if (areas_to_redact.length > 0) {
        let first_image_url = this.props.framesets[hash_key]['images'][0]
        for (let i=0; i < this.props.framesets[hash_key]['areas_to_redact'].length; i++) {                            
          let a2r = this.props.framesets[hash_key]['areas_to_redact'][i]
          pass_arr.push([a2r['start'], a2r['end']])
        }  
        this.callRedactOnOneFrame(pass_arr, first_image_url) 
      } 
    }
    document.getElementById('reassemble_video_button').disabled = true;
    document.getElementById('reassemble_video_button').innerHTML = 'Reassemble Called'
  }

  getNameFor(image_name) {
    let s = image_name.substring(image_name.lastIndexOf('/')+1, image_name.length);
    s = s.substring(0, s.indexOf('.'))
    return s
  }

  componentDidMount() {
    document.getElementById('frame_button').disabled = true;
  }

  toggleFrameFramesetCallback() {
    if (this.state.frame_frameset_view_mode === 'frame') {
      this.setState({
        frame_button_classes: 'btn btn-primary',
        frame_button_text : 'Display Frames',
        frameset_button_classes: 'btn btn-secondary',
        frameset_button_text: 'Showing Framesets',
        frame_frameset_view_mode: 'frameset',
      });
      document.getElementById('frameset_button').disabled = true;
      document.getElementById('frame_button').disabled = false;
      document.getElementById('frameset_cards').style.display = 'block';
      document.getElementById('frame_cards').style.display = 'none';
    } else {
      this.setState({
        frameset_button_classes: 'btn btn-primary',
        frameset_button_text : 'Display Framesets',
        frame_button_classes: 'btn btn-secondary',
        frame_button_text: 'Showing Frames',
        frame_frameset_view_mode: 'frame',
      });
      document.getElementById('frame_button').disabled = true;
      document.getElementById('frameset_button').disabled = false;
      document.getElementById('frame_cards').style.display = 'block';
      document.getElementById('frameset_cards').style.display = 'none';
    }
  } 

  doMovieParse() {
    this.callMovieSplit()
  }

  doButtonReset() {
    document.getElementById('parse_video_button').disabled = false;
    document.getElementById('reassemble_video_button').disabled = false;
    document.getElementById('movieparser_status').innerHTML = 'buttons have been reset to active'
    document.getElementById('parse_video_button').innerHTML = 'Parse'
    document.getElementById('reassemble_video_button').innerHTML = 'Reassemble Video'
  }

  setZoomImageUrl = (the_url) => {
    this.setState({
      zoom_image_url: the_url,
    })
  }

  render() {
    let redacted_video_element = <div />

    if (this.props.redacted_movie_url) {
      redacted_video_element = (
        <div>
            <h3>Redacted Video</h3>
            <div id='redacted_video_url'></div>
            <video id='redacted_video_id' controls >
              <source 
                  id='redacted_video_source'
                  src={this.props.redacted_movie_url}
                  type="video/mp4" 
              />
              Your browser does not support the video tag.
            </video>
            <a 
                href={this.props.redacted_movie_url}
                download={this.getRedactedMovieFilename()}
            >
              download movie
            </a>
          </div>
      )
    }

    return (
    <div>
      <div 
          id='image-zoom-modal'
          style={{display: this.state.zoom_image_url? 'block' : 'none' }}
      >
        <img 
            src={this.state.zoom_image_url}
            alt='zoomed in'
            onClick={() => this.setZoomImageUrl('')}
        />
      </div>
      <div id='movie_parser_panel'>
        <div id='video_and_meta' className='row mt-3'>
          <div id='video_meta_div' className='col-md-12'>
            <div className='row'>
              <button 
                  id='parse_video_button'
                  className='btn btn-primary' 
                  onClick={this.doMovieParse.bind(this)}
              >
                Parse Video
              </button>
              <button 
                  id='reassemble_video_button'
                  className='btn btn-primary ml-5' 
                  onClick={this.callFrameRedactions.bind(this)}
              >
                Reassemble Video
              </button>
              <button 
                  className='btn btn-primary ml-5' 
                  onClick={this.doButtonReset.bind(this)}
              >
                Reset
              </button>
            </div>
            <div className='row'>
              <div 
                  id='movieparser_status'
                  className='col-md-6 mt-2'
              >
                status
              </div>
            </div>
          </div>


          <div id='video_div' className='col-md-6'>
            <h3>Source Video</h3>
            <video id='video_id' controls >
              <source 
                  src={this.props.movie_url}
                  type="video/mp4" 
              />
              Your browser does not support the video tag.
            </video>
          </div>
          <div 
              id='redacted_video_div' 
              className='col-md-6'
          >
            {redacted_video_element}
          </div>
        </div>
        <div id='frame_and_frameset_data' className='row mt-3'>
          <div id='frame_frameset_header' className='col-md-12'>
            <div className='row container'>
              <div id='ffh_frame_title' className='col-md-3'>
                <button
                    id='frame_button'
                    className={this.state.frame_button_classes}
                    onClick={this.toggleFrameFramesetCallback}
                >
                  {this.state.frame_button_text}
                </button>
              </div>
              <div id='ffh_frameset_title' className='col-md-3'>
                <button
                    id='frameset_button'
                    className={this.state.frameset_button_classes}
                    onClick={this.toggleFrameFramesetCallback}
                >
                  {this.state.frameset_button_text}
                </button>
              </div>
            </div>
          </div>
          <div id='frame_cards' className='col-md-12'>
            <div id='cards_row' className='row m-5'>
              <FrameCardList 
                frames={this.props.frames}
                getNameFor={this.getNameFor}
                imageUrlHasRedactionInfo={this.imageUrlHasRedactionInfo}
              />
            </div>
          </div>
          <div id='frameset_cards' className='col-md-12'>
            <div id='cards_row' className='row m-5'>
              <FramesetCardList 
                frames={this.props.frames}
                framesets={this.props.framesets}
                getNameFor={this.getNameFor}
                redactFramesetCallback={this.redactFramesetCallback}
                getRedactionFromFrameset={this.props.getRedactionFromFrameset}
                setDraggedId={this.setDraggedId}
                handleDroppedFrameset={this.handleDroppedFrameset}
                setZoomImageUrl={this.setZoomImageUrl}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
    );
  }
}

export default MoviePanel;
