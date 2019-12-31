import React from 'react';
import FramesetCardList from './Framesets'

class MoviePanel extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      draggedId: null,
      zoom_image_url: '',
      message: '.',
    }
    this.getNameFor=this.getNameFor.bind(this)
    this.redactFramesetCallback=this.redactFramesetCallback.bind(this)
    this.callMovieSplit=this.callMovieSplit.bind(this)
    this.callReassembleVideo=this.callReassembleVideo.bind(this)
    this.setDraggedId=this.setDraggedId.bind(this)
    this.setZoomImageUrl=this.setZoomImageUrl.bind(this)
    this.handleDroppedFrameset=this.handleDroppedFrameset.bind(this)
    this.afterFrameRedaction=this.afterFrameRedaction.bind(this)
    this.movieSplitCompleted=this.movieSplitCompleted.bind(this)
    this.movieZipCompleted=this.movieZipCompleted.bind(this)
    this.setMessage=this.setMessage.bind(this)
  }

  setMessage(the_message) {
    this.setState({
      message: the_message,
    })
  }

  setDraggedId = (the_id) => {
    this.setState({
      draggedId: the_id,
    })
  }

  handleDroppedFrameset = (target_id) => {
    this.props.handleMergeFramesets(target_id, this.state.draggedId)
  }

  callMovieSplit() {
    this.props.doMovieSplit(this.props.movie_url, this.movieSplitCompleted)
    this.setMessage('splitting movie into frames')
  }

  afterFrameRedaction() {
    if (this.allFramesHaveBeenRedacted()) {
      this.zipUpRedactedImages()
    }
  }

  allFramesHaveBeenRedacted() {
    const framesets = this.props.getCurrentFramesets()
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
    const framesets = this.props.getCurrentFramesets()
    let movie_frame_urls = []
    const frames = this.props.getCurrentFrames()
    for (let i=0; i < frames.length; i++) {
      let image_url = frames[i]
      let the_hash = this.props.getFramesetHashForImageUrl(image_url)
      let the_frameset = framesets[the_hash]
      if (('areas_to_redact' in the_frameset) && the_frameset['areas_to_redact'].length > 0) {
        movie_frame_urls.push(the_frameset['redacted_image'])
      } else {
        movie_frame_urls.push(image_url)
      }
    }
    this.setMessage('reassembling frames')
    this.props.callMovieZip(movie_frame_urls, this.movieZipCompleted)
  }

  movieZipCompleted() {
    this.setMessage('movie reassembly completed')
  }

  movieSplitCompleted() {
    this.setMessage('movie split completed')
  }

  redactFramesetCallback = (frameset_hash) => {
    let first_image_url = this.props.getCurrentFramesets()[frameset_hash]['images'][0]
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

  callReassembleVideo() {
    this.setMessage('calling movie reassembler')
    this.props.setMovieRedactedUrl('')
    let frameset_keys = Object.keys(this.props.getCurrentFramesets())
    for (let i=0; i < frameset_keys.length; i++) {
      let pass_arr = []
      let hash_key = frameset_keys[i]
      const areas_to_redact = this.props.getRedactionFromFrameset(hash_key)
      if (areas_to_redact.length > 0) {
        const framesets = this.props.getCurrentFramesets()
        let first_image_url = framesets[hash_key]['images'][0]
        for (let i=0; i < framesets[hash_key]['areas_to_redact'].length; i++) {                            
          let a2r = framesets[hash_key]['areas_to_redact'][i]
          pass_arr.push([a2r['start'], a2r['end']])
        }  
        this.props.callRedact(pass_arr, first_image_url, this.afterFrameRedaction)
      } 
    }
  }

  getNameFor(image_name) {
    let s = image_name.substring(image_name.lastIndexOf('/')+1, image_name.length);
    s = s.substring(0, s.indexOf('.'))
    return s
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

  buildVideoTitle() {
    let title_string = <h3>&nbsp;</h3>
    const movie_filename = this.get_filename(this.props.movie_url)
    if (movie_filename) {
      title_string = (
        <div
        >
          <h5>
          Video for {movie_filename}
          </h5>
        </div>
      )
    }
    return title_string
  }

  buildImageZoomModal() {
    return (
      <div className="modal" id='moviePanelModal' tabIndex="-1" role="dialog">
        <div className="modal-dialog modal-xl" id='moviePanelModalInner' role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Viewing Image</h5>
              <button type="button" className="close" data-dismiss="modal" aria-label="Close">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div className="modal-body">
                <img 
                    id='movie_zoom_image'
                    src={this.state.zoom_image_url}
                    alt='whatever'
                />
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" data-dismiss="modal">Close</button>
            </div>
          </div>
        </div>
      </div>    
    )
  }

  buildVideoDiv() {
    return (
      <div id='video_div' className='col-md-6'>
        <video id='video_id' controls >
          <source 
              src={this.props.movie_url}
              type="video/mp4" 
          />
          Your browser does not support the video tag.
        </video>
      </div>
    )
  }

  buildRedactedVideoDiv() {
    let redacted_video_element = <div />
    const red_mov_url = this.props.getRedactedMovieUrl()
    if (red_mov_url) {
      redacted_video_element = (
        <div>
          <h3>Redacted Video</h3>
          <div id='redacted_video_url'></div>
          <video id='redacted_video_id' controls >
            <source 
                id='redacted_video_source'
                src={red_mov_url}
                type="video/mp4" 
            />
            Your browser does not support the video tag.
          </video>
        </div>
      )
    }

    return (
      <div 
          id='redacted_video_div' 
          className='col-md-6'
      >
        {redacted_video_element}
      </div>
    )
  }

  render() {
    let title = this.buildVideoTitle()
    const image_zoom_modal = this.buildImageZoomModal()
    const video_div = this.buildVideoDiv()
    const redacted_video_div = this.buildRedactedVideoDiv()

    return (
    <div>

      {image_zoom_modal}

      <div id='movie_parser_panel'>
        <div 
            id='movie_parser_header' 
            className='row m-3'
        >
          {title}
        </div>

        <div id='video_and_meta' className='row mt-3'>
          <div id='video_meta_div' className='col-md-12'>
            <MoviePanelHeader
              callMovieSplit={this.callMovieSplit}
              callReassembleVideo={this.callReassembleVideo}
              message={this.state.message}
            />
          </div>

          {video_div}
          {redacted_video_div}

          <MoviePanelAdvancedControls
            movie_url={this.props.movie_url}
            movies={this.props.movies}
            setMessage={this.setMessage}
            setFramesetDiscriminator={this.props.setFramesetDiscriminator}
            getRedactedMovieUrl={this.props.getRedactedMovieUrl}
            templates={this.props.templates}
            runTemplates={this.props.runTemplates}
          />

        </div>

        <div id='frame_and_frameset_data' className='row mt-3'>
          <div id='frameset_cards' className='col-md-12'>
            <div id='cards_row' className='row m-5'>
              <FramesetCardList 
                getCurrentFramesets={this.props.getCurrentFramesets}
                getNameFor={this.getNameFor}
                redactFramesetCallback={this.redactFramesetCallback}
                getRedactionFromFrameset={this.props.getRedactionFromFrameset}
                setDraggedId={this.setDraggedId}
                handleDroppedFrameset={this.handleDroppedFrameset}
                setZoomImageUrl={this.setZoomImageUrl}
                getFramesetHashesInOrder={this.props.getFramesetHashesInOrder}
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    );
  }
}

class MoviePanelAdvancedControls extends React.Component {
  buildFramesetDiscriminatorDropdown() {
    return (
      <div
          className='d-inline ml-2 mt-2'
      >
         <select
            title='Frameset Discriminator'
            name='frameset_discriminator'
            onChange={(event) => 
              this.props.setFramesetDiscriminator(
                event.target.value,
                this.props.setMessage('framework discriminator updated')
              )
            }
         >
          <option value='gray8'>--FramesetDiscriminator--</option>
          <option value='gray64'>gray 64x64</option>
          <option value='gray32'>gray 32x32</option>
          <option value='gray16'>gray 16x16</option>
          <option value='gray8'>gray 8x8 (default)</option>
          <option value='gray6'>gray 6x6</option>
          <option value='gray4'>gray 4x4</option>
        </select>
      </div>
    )
  }

  buildRedactedMovieDownloadLink() {
    const red_mov_url = this.props.getRedactedMovieUrl()
    if (red_mov_url) {
      return (
        <a 
            href={red_mov_url}
            download={red_mov_url}
        >
          download redacted movie
        </a>
      )
    }
  }

  buildTemplatesString() {
    let loaded_templates = []
    if (this.props.templates) {
      const temp_keys = Object.keys(this.props.templates)
      for (let i=0; i < temp_keys.length; i++) {
        loaded_templates.push(this.props.templates[temp_keys[i]]['name'])
      }
    }
    return (
      <ul>
      {loaded_templates.map((value, index) => {
        return (
          <li key={index}>{value}</li>
        )
      })}
      </ul>
    )
  }

  buildTemplateButton() {
    const template_keys = Object.keys(this.props.templates)
    if (!template_keys.length) {
      return ''
    }
    return (
      <div id='template_div' className='d-inline'>
        <button className='btn btn-primary dropdown-toggle ml-2' type='button' id='templateDropdownButton'
            data-toggle='dropdown' aria-haspopup='true' aria-expanded='false'>
          Template
        </button>
        <div className='dropdown-menu' aria-labelledby='tempateDropdownButton'>
          <button className='dropdown-item'
              onClick={() => this.props.runTemplates('all', 'current_movie')}
              href='.'>
            Run all
          </button>
          {template_keys.map((value, index) => {
            return (
              <button className='dropdown-item'
                  key={index}
                  onClick={() => this.props.runTemplates(this.props.templates[value]['id'], 'current_movie')}
                  href='.'>
                Run {this.props.templates[value]['name']}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  render() {
    let frameset_discriminator = ''
    let runtime = '0:00'
    let nickname = ''
    let num_framesets = '0'
    let redacted = 'No'
    let frame_dimensions = 'unknown'
    let templates_string = this.buildTemplatesString()
    let templates_button = this.buildTemplateButton()
    const redacted_movie_dl_link = this.buildRedactedMovieDownloadLink()

    const fd_dropdown = this.buildFramesetDiscriminatorDropdown()
    if (this.props.movie_url && Object.keys(this.props.movies).includes(this.props.movie_url)) {
      const movie = this.props.movies[this.props.movie_url]
      frameset_discriminator = movie['frameset_discriminator']
      const num_frames = movie['frames'].length
      num_framesets = Object.keys(movie['framesets']).length.toString()
      const num_mins = Math.floor(num_frames / 60)
      const num_secs = num_frames % 60
      if (Object.keys(movie).includes('frame_dimensions')) {
        frame_dimensions = movie['frame_dimensions'][0] + 'x' + movie['frame_dimensions'][1]
      }
      let num_secs_string = num_secs.toString()
      if (num_secs_string.length === 1) {
        num_secs_string = '0' + num_secs_string
      }
      runtime = num_mins.toString() + ':' + num_secs_string
      nickname = movie.nickname
      const red_mov_url = this.props.getRedactedMovieUrl()
      if (red_mov_url) {
        redacted = 'Yes'
      }
    }


    return (
      <div className='col-md-9 m-2 bg-light rounded'>
        <div className='row'>
          <div
            className='col h3'
          >
            movie info
          </div>
          <div className='col'>
            <button
                className='btn btn-link'
                aria-expanded='false'
                data-target='#advanced_body'
                aria-controls='advanced_body'
                data-toggle='collapse'
                type='button'
            >
              show/hide
            </button>
          </div>
        </div>

        <div
            id='advanced_body'
            className='row collapse'
        >
          <div id='advanced_main' className='col'>
            <div id='movie_info_div m-2'>
              <div>Title: {nickname}</div>
              <div>Number of framesets: {num_framesets}</div>
              <div>Run Time: {runtime}</div>
              <div>Redacted? {redacted}</div>
              <div>Frameset Discriminator: {frameset_discriminator}</div>
              <div>Frame Dimensions: {frame_dimensions}</div>
              <div>
                Loaded Templates:
                {templates_string}
              </div>
              <div>
                {redacted_movie_dl_link}
              </div>
            </div>
            <div 
                className='border-top p-2'
                id='movie_controls_div_secondary'
            >
              <div>
                <span>set frameset discriminator</span>
                {fd_dropdown}
              </div>
              <div 
                className='mt-2'
              >
                {templates_button}
              </div>
            </div>
          </div>
        </div>

      </div>
    )
  }
}

class MoviePanelHeader extends React.Component {
  render() {
    return (
      <div>
        <div className='row m-2'>

          <button 
              id='parse_video_button'
              className='btn btn-primary' 
              onClick={() => this.props.callMovieSplit()}
          >
            Split Video
          </button>

          <button 
              id='reassemble_video_button'
              className='btn btn-primary ml-5' 
              onClick={() => this.props.callReassembleVideo()}
          >
            Redact & Reassemble Video
          </button>

        </div>
        <div className='row'>
          <div 
              id='movieparser_status'
              className='col-md-6 mt-2'
          >
            {this.props.message}
          </div>
        </div>
        </div>
    )
  }
}

export default MoviePanel;
