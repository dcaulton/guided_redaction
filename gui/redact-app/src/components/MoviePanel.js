import React from 'react';
import FramesetCardList from './Framesets'

class MoviePanel extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      reassembling_video: false,
      draggedId: null,
      zoom_image_url: '',
    }
    this.getNameFor = this.getNameFor.bind(this)
    this.redactFramesetCallback = this.redactFramesetCallback.bind(this)
    this.callMovieSplit = this.callMovieSplit.bind(this)
    this.setDraggedId = this.setDraggedId.bind(this)
    this.setZoomImageUrl= this.setZoomImageUrl.bind(this)
    this.handleDroppedFrameset = this.handleDroppedFrameset.bind(this)
    this.allFramesHaveBeenRedacted = this.allFramesHaveBeenRedacted.bind(this)
    this.afterFrameRedaction= this.afterFrameRedaction.bind(this)
    this.movieZipCompleted= this.movieZipCompleted.bind(this)
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
    document.getElementById('parse_video_button').disabled = true;
    document.getElementById('parse_video_button').innerHTML = 'Movie Parse Called'
  }

  callMovieSplit() {
    document.getElementById('movieparser_status').innerHTML = 'calling movie unzipper'
    this.props.doMovieSplit(this.props.movie_url, this.movieSplitWhenDone)
  }

  afterFrameRedaction() {
    if (this.allFramesHaveBeenRedacted()) {
      this.zipUpRedactedImages()
    }
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
    document.getElementById('movieparser_status').innerHTML = 'calling movie zipper'
    this.props.callMovieZip(movie_frame_urls, this.movieZipCompleted)
  }

  movieZipCompleted() {
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
        this.props.callRedact(pass_arr, first_image_url, this.afterFrameRedaction)
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

  get_filename(the_url) {
    if (this.props.movie_url) {
      const parts = this.props.movie_url.split('/')
      return parts[parts.length-1]
    }
  }

  render() {
    let framesets_title = ''
    const framesets_count = Object.keys(this.props.framesets).length
    if (framesets_count) {
      framesets_title = (
        <span id='frameset_title'>
          Showing {framesets_count} framesets
        </span>
      )
    }
    let source_video_string = <h3>&nbsp;</h3>
    const movie_filename = this.get_filename(this.props.movie_url)
    if (movie_filename) {
      source_video_string = <h3>Source Video for {movie_filename}</h3>
    }
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
                download={this.props.redacted_movie_url}
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
            {source_video_string}
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
            {framesets_title}
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
