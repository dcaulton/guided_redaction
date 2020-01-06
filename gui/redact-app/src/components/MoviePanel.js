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
    this.setDraggedId=this.setDraggedId.bind(this)
    this.setZoomImageUrl=this.setZoomImageUrl.bind(this)
    this.handleDroppedFrameset=this.handleDroppedFrameset.bind(this)
    this.setMessage=this.setMessage.bind(this)
    this.submitMovieJob=this.submitMovieJob.bind(this)
  }


  buildTemplateMatchJobdata(extra_data) {
    let job_data = {
      request_data: {},
    }
    job_data['app'] = 'analyze'
    job_data['operation'] = 'scan_template'
    job_data['description'] = 'single template single movie match'
    if (extra_data === 'all') {
      console.log("gotta implement all templates soon, aborting for now")
      return
    }
    let template = this.props.templates[extra_data]
    job_data['request_data']['template'] = template
    job_data['request_data']['source_image_url'] = template['anchors'][0]['image']
    job_data['request_data']['template_id'] = template['id']
    const wrap = {}                                                                                                   
    wrap[this.props.movie_url] = this.props.movies[this.props.movie_url]                                              
    job_data['request_data']['target_movies'] = wrap                                                                  
    return job_data
  }

  buildRedactFramesetsJobData(extra_data) {
    let job_data = {
      request_data: {},
    }
    job_data['app'] = 'redact'
    job_data['operation'] = 'redact'
    job_data['description'] = 'redact images for movie movie: ' + this.props.movie_url

    let all_redaction_images = []
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
        all_redaction_images.push({
          image_url: first_image_url,
          areas_to_redact: pass_arr,
          return_type: 'url',
          mask_method: this.props.mask_method,
        })
      } 
    }
    job_data['request_data'] = all_redaction_images
    return job_data
  }

  buildZipMovieJobdata() {
    let job_data = {
      request_data: {},
    }
    let image_urls = []
    let movie = this.props.movies[this.props.movie_url]
    for (let i=0; i < movie['frames'].length; i++) {
      const frame_image = movie['frames'][i]
      const frameset_hash = this.props.getFramesetHashForImageUrl(frame_image)
      if (Object.keys(movie['framesets'][frameset_hash]).includes('redacted_image')) {
        image_urls.push(movie['framesets'][frameset_hash]['redacted_image'])
      } else {
        image_urls.push(frame_image)
      }
    }
    job_data['app'] = 'parse'
    job_data['operation'] = 'zip_movie'
    job_data['description'] = 'zip movie: ' + this.props.movie_url
    job_data['request_data']['movie_name'] = this.props.getRedactedMovieFilename()
    job_data['request_data']['image_urls'] = image_urls
    return job_data
  }

  buildSplitAndHashJobData(extra_data) {
    let job_data = {
      request_data: {},
    }
    job_data['app'] = 'parse'
    job_data['operation'] = 'split_and_hash_movie'
    job_data['description'] = 'load and hash movie: ' + extra_data
    job_data['request_data']['movie_url'] = extra_data
    job_data['request_data']['frameset_discriminator'] = this.props.frameset_discriminator
    return job_data
  }

  submitMovieJob(job_string, extra_data = '') {
    if (job_string === 'split_and_hash_video') {
      const job_data = this.buildSplitAndHashJobData(extra_data)
      function afterLoaded() {
        this.setMessage('movie split completed')
      }
      let boundAfterLoaded=afterLoaded.bind(this)
      this.props.submitJob(job_data, this.setMessage('movie split job was submitted'), true, boundAfterLoaded)
    } else if (job_string === 'redact_framesets') {
      const job_data = this.buildRedactFramesetsJobData(extra_data)
      function afterLoaded() {
        this.setMessage('frameset redactions completed')
      }
      let boundAfterLoaded=afterLoaded.bind(this)
      // deleting chained jobs is a little buggy, needs clean up
      // for now we'll clean up manually from the insights panel
      this.props.submitJob(job_data, this.setMessage('redact frames job was submitted'), false, boundAfterLoaded)
    } else if (job_string === 'template_match') {
      const job_data = this.buildTemplateMatchJobdata(extra_data)
      function afterLoaded() {
        this.setMessage('template match completed')
      }
      let boundAfterLoaded=afterLoaded.bind(this)
      this.props.submitJob(job_data, this.setMessage('template match job was submitted'), true, boundAfterLoaded)
    } else if (job_string === 'zip_movie') {
      const job_data = this.buildZipMovieJobdata(extra_data)
      function afterLoaded() {
        this.setMessage('movie zip completed')
      }
      let boundAfterLoaded=afterLoaded.bind(this)
      this.props.submitJob(job_data, this.setMessage('zip movie job was submitted'), true, boundAfterLoaded)
    } else if (job_string === 'movie_panel_redact_and_reassemble_video') {
      console.log('redact and reassemble called - NOT SUPPORTED YET')
    }
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
          <div id='redacted_video_url'></div>
          <video id='redacted_video_id' controls >
            <source 
                id='redacted_video_source'
                src={red_mov_url}
                type="video/mp4" 
            />
            Your browser does not support the video tag.
          </video>
          <h3>Redacted Video</h3>
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

  buildFramesetsTitle() {
    
    if (Object.keys(this.props.getCurrentFramesets()).length > 0) {
      return (
          <div className='col col-lg-10 p-2 border-bottom border-top'>
          <span className='mt-2 h5'>Framesets - drag and drop to merge</span>
          </div>
      )
    }
  }

  render() {
    let title = this.buildVideoTitle()
    const image_zoom_modal = this.buildImageZoomModal()
    const video_div = this.buildVideoDiv()
    const redacted_video_div = this.buildRedactedVideoDiv()
    const framesets_title = this.buildFramesetsTitle()

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
              message={this.state.message}
              submitMovieJob={this.submitMovieJob}
              movie_url={this.props.movie_url}
              templates={this.props.templates}
              runTemplates={this.props.runTemplates}
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
            setMaskMethod={this.props.setMaskMethod}
            submitMovieJob={this.submitMovieJob}
          />

        </div>

        <div id='frame_and_frameset_data' className='row mt-3'>
          {framesets_title}
          <div id='frameset_cards' className='col-md-12'>
            <div id='cards_row' className='row m-2'>
              <FramesetCardList 
                getCurrentFramesets={this.props.getCurrentFramesets}
                getNameFor={this.getNameFor}
                redactFramesetCallback={this.redactFramesetCallback}
                getRedactionFromFrameset={this.props.getRedactionFromFrameset}
                setDraggedId={this.setDraggedId}
                handleDroppedFrameset={this.handleDroppedFrameset}
                setZoomImageUrl={this.setZoomImageUrl}
                getFramesetHashesInOrder={this.props.getFramesetHashesInOrder}
                getRedactedImageFromFrameset={this.props.getRedactedImageFromFrameset}
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

  render() {
    let frameset_discriminator = ''
    let runtime = '0:00'
    let nickname = ''
    let num_framesets = '0'
    let redacted = 'No'
    let frame_dimensions = 'unknown'
    let templates_string = this.buildTemplatesString()
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
            className='col-lg-10 h3 float-left'
          >
            movie info
          </div>
          <div 
              className='d-inline float-right'
          >
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
          <div id='advanced_main' className='col ml-3'>
            <div id='movie_info_div m-2'>
              <div>Title: {nickname}</div>
              <div>Number of framesets: {num_framesets}</div>
              <div>Run Time: {runtime}</div>
              <div>Movie Redacted? {redacted}</div>
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

              <div>
                <span>set mask method</span>
                <select
                    className='ml-2'
                    name='mask_method'
                    onChange={(event) => this.props.setMaskMethod(event.target.value)}
                >
                  <option value='blur_7x7'>--- Mask Method ---</option>
                  <option value='blur_7x7'>Gaussian Blur 7x7</option>
                  <option value='blur_21x21'>Gaussian Blur 21x21</option>
                  <option value='blur_median'>Median Blur</option>
                  <option value='black_rectangle'>Black Rectangle</option>
                  <option value='green_outline'>Green Outline</option>
                </select>
              </div>

            </div>
          </div>
        </div>

      </div>
    )
  }
}

class MoviePanelHeader extends React.Component {
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
              onClick={() => this.props.submitMovieJob('template_match', 'all')}
              href='.'>
            Run all
          </button>
          {template_keys.map((value, index) => {
            return (
              <button className='dropdown-item ml-2'
                  key={index}
                  onClick={() => this.props.submitMovieJob('template_match', this.props.templates[value]['id'])}
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
    let templates_button = this.buildTemplateButton()
    return (
      <div>
        <div className='row m-2'>

          <button 
              id='parse_video_button'
              className='btn btn-primary' 
              onClick={() => this.props.submitMovieJob('split_and_hash_video', this.props.movie_url)}
          >
            Split Video
          </button>

          {templates_button}

          <button 
              id='parse_video_button'
              className='btn btn-primary ml-2' 
              onClick={() => this.props.submitMovieJob('redact_framesets')}
          >
            Redact All Frames
          </button>

          <button 
              id='reassemble_video_button'
              className='btn btn-primary ml-2' 
              onClick={() => this.props.submitMovieJob('zip_movie')}
          >
            Reassemble Video
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
