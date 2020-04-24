import React from 'react';
import FramesetCardList from './Framesets'

class MoviePanel extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      draggedId: null,
      zoom_image_url: '',
      message: '.',
      uploadMove: false,
      movie_resolution_new: '',
      frameset_offset_seconds: '0',
      frameset_offset_minutes: '0',
      highlighted_frameset_hash: '',
    }
    this.getNameFor=this.getNameFor.bind(this)
    this.redactFramesetCallback=this.redactFramesetCallback.bind(this)
    this.setDraggedId=this.setDraggedId.bind(this)
    this.setZoomImageUrl=this.setZoomImageUrl.bind(this)
    this.handleDroppedFrameset=this.handleDroppedFrameset.bind(this)
    this.setMessage=this.setMessage.bind(this)
    this.submitMovieJob=this.submitMovieJob.bind(this)
    this.showMovieUploadTarget=this.showMovieUploadTarget.bind(this)
    this.changeMovieResolutionNew=this.changeMovieResolutionNew.bind(this)
    this.changeFramesetOffsetSeconds=this.changeFramesetOffsetSeconds.bind(this)
    this.changeFramesetOffsetMinutes=this.changeFramesetOffsetMinutes.bind(this)
    this.findFramesetAtOffset=this.findFramesetAtOffset.bind(this)
  }

  findFramesetAtOffset(offset) {
    const cur_movie_frames = this.props.movies[this.props.movie_url]['frames']
    let frame = ''
    if (offset > cur_movie_frames.length) {
      frame = cur_movie_frames[cur_movie_frames.length-1]
    } else {
      frame = cur_movie_frames[offset]
    }
    const frameset_hash = this.props.getFramesetHashForImageUrl(frame)
    this.setState({
      highlighted_frameset_hash: frameset_hash,
    })
  }

  componentDidMount() {
    if (!this.props.movie_url) {
      this.showMovieUploadTarget()
    }
  }

  showMovieUploadTarget() {
    const value = !this.state.uploadMovie
    this.setState({
      uploadMovie: value,
    })
  }

  changeMovieResolutionNew(value) {
    this.setState({
      movie_resolution_new: value,
    })
  }

  changeFramesetOffsetSeconds(seconds) {
    this.setState({
      frameset_offset_seconds: seconds,
    })
  }

  changeFramesetOffsetMinutes(minutes) {
    this.setState({
      frameset_offset_minutes: minutes,
    })
  }

  buildTemplateMatchJobdata(extra_data) {
    let job_data = {
      request_data: {},
    }
    job_data['app'] = 'analyze'
    let templates_wrap = {}
    if (extra_data === 'all_templates') {
      job_data['operation'] = 'scan_template_multi'
      job_data['description'] = 'multi template single movie match from MoviePanel:'
      job_data['description'] += ' movie ' + this.props.movie_url
      templates_wrap = this.props.templates
      const temp_group_id = 'template_group_' + Math.floor(Math.random(10000, 99999)*100000).toString()
      job_data['request_data']['id'] = temp_group_id
    } else {
      let template = this.props.templates[extra_data]
      job_data['operation'] = 'scan_template'
      job_data['description'] = 'single template single movie match from MoviePanel:'
      job_data['description'] += ' template ' + template['name']
      job_data['description'] += ' movie ' + this.props.movie_url
      templates_wrap[template['id']] = template
      job_data['request_data']['template_id'] = template['id']
      job_data['request_data']['id'] = template['id']
    }
    job_data['request_data']['tier_1_scanners'] = {}
    job_data['request_data']['tier_1_scanners']['template'] = templates_wrap
    job_data['request_data']['scan_level'] = 'tier_2'
    let movies_wrap = {}
    movies_wrap[this.props.movie_url] = this.props.movies[this.props.movie_url]
    job_data['request_data']['movies'] = movies_wrap
    return job_data
  }

  buildRedactFramesetsJobData(extra_data) {
    let job_data = {
      request_data: {},
    }
    job_data['app'] = 'redact'
    job_data['operation'] = 'redact'
    job_data['description'] = 'redact images for movie: ' + this.props.movie_url
    job_data['request_data']['movies'] = {}
    job_data['request_data']['movies'][this.props.movie_url] = this.props.movies[this.props.movie_url]
    job_data['request_data']['mask_method'] = this.props.mask_method
    job_data['request_data']['meta'] = {
      return_type: 'url',
      preserve_working_dir_across_batch: true,
    }
    return job_data
  }

  buildRedactedMovieFilename() {
    //TODO this is not friendly to file names with more than one period, or with a slash in them
    let parts = this.props.movie_url.split('/')
    let file_parts = parts[parts.length-1].split('.')
    let new_filename = file_parts[0] + '_redacted.' + file_parts[1]
    return new_filename
  }

  buildImageUrlsToZip(movie) {
    let image_urls = []
    for (let i=0; i < movie['frames'].length; i++) {
      const frame_image = movie['frames'][i]
      const frameset_hash = this.props.getFramesetHashForImageUrl(frame_image)
      if (frameset_hash) {
        if (Object.keys(movie['framesets'][frameset_hash]).includes('redacted_image')) {
          image_urls.push(movie['framesets'][frameset_hash]['redacted_image'])
        } else {
          image_urls.push(frame_image)
        }
      } else {
        console.log('PROBLEM: no frameset hash found for ' + frame_image)
      }
    }
    return image_urls
  }

  buildZipMovieJobdata() {
    let job_data = {
      request_data: {},
    }
    let movie = this.props.movies[this.props.movie_url]
    job_data['app'] = 'parse'
    job_data['operation'] = 'zip_movie'
    job_data['description'] = 'zip movie: ' + this.props.movie_url
    job_data['request_data']['new_movie_name'] = this.buildRedactedMovieFilename()
    job_data['request_data']['movie_url'] = this.props.movie_url
    if (Object.keys(movie).includes('audio_url')) {
        job_data['request_data']['audio_url'] = movie['audio_url']
    }
    const image_urls = this.buildImageUrlsToZip(movie) 
    job_data['request_data']['image_urls'] = image_urls
    return job_data
  }

  buildSplitAndHashJobData(extra_data) {
    let job_data = {
      request_data: {},
    }
    job_data['app'] = 'parse'
    job_data['operation'] = 'split_and_hash_threaded'
    job_data['description'] = 'split and hash threaded from MoviePanel: ' + extra_data
    job_data['request_data']['movie_urls'] = [extra_data]
    job_data['request_data']['preserve_movie_audio'] = this.props.preserve_movie_audio
    job_data['request_data']['frameset_discriminator'] = this.props.frameset_discriminator
    return job_data
  }

  buildSplitJobData(extra_data) {
    let job_data = {
      request_data: {},
    }
    job_data['app'] = 'parse'
    job_data['operation'] = 'split_threaded'
    job_data['description'] = 'split movie from MoviePanel: movie ' + this.props.movie_url
    job_data['request_data'] = {
      movie_url: this.props.movie_url,
      preserve_movie_audio: this.props.preserve_movie_audio,
    }
    return job_data
  }

  buildHashJobData(extra_data) {
    let job_data = {
      request_data: {},
    }
    job_data['app'] = 'parse'
    job_data['operation'] = 'hash_movie'
    job_data['description'] = 'hash movie from MoviePanel: movie ' + this.props.movie_url
    job_data['request_data'] = {}
    job_data['request_data']['movies'] = {}
    job_data['request_data']['movies'][this.props.movie_url] = this.props.movies[this.props.movie_url]
    job_data['request_data']['movies'][this.props.movie_url]['frameset_discriminator'] = this.props.frameset_discriminator
    return job_data
  }

  buildCopyJobData(extra_data) {
    let job_data = {
      request_data: {},
    }
    job_data['app'] = 'parse'
    job_data['operation'] = 'copy_movie'
    job_data['description'] = 'copy movie from MoviePanel: movie ' + this.props.movie_url
    job_data['request_data'] = {}
    job_data['request_data']['movies'] = {}
    job_data['request_data']['movies'][this.props.movie_url] = this.props.movies[this.props.movie_url]
    return job_data
  }

  buildChangeResolutionJobData(extra_data) {
    let job_data = {
      request_data: {},
    }
    job_data['app'] = 'parse'
    job_data['operation'] = 'change_movie_resolution'
    job_data['description'] = 'change movie resolution from MoviePanel: movie ' + this.props.movie_url
    job_data['request_data'] = {}
    job_data['request_data']['movies'] = {}
    job_data['request_data']['movies'][this.props.movie_url] = this.props.movies[this.props.movie_url]
    job_data['request_data']['resolution'] = this.state.movie_resolution_new
    return job_data
  }

  submitMovieJob(job_string, extra_data = '') {
    if (job_string === 'split_and_hash_video') {
      const job_data = this.buildSplitAndHashJobData(extra_data)
      this.props.submitJob({
        job_data:job_data, 
        after_submit: () => {this.setMessage('movie split job was submitted')}, 
        cancel_after_loading: true, 
        after_loaded: () => {this.setMessage('movie split completed')}, 
        when_failed: () => {this.setMessage('movie split failed')},
      })
    } else if (job_string === 'split_movie') {
      const job_data = this.buildSplitJobData(extra_data)
      this.props.submitJob({
        job_data:job_data, 
        after_submit: () => {this.setMessage('movie split job was submitted')}, 
        cancel_after_loading: true, 
        after_loaded: () => {this.setMessage('movie split completed')}, 
        when_failed: () => {this.setMessage('movie split failed')},
      })
    } else if (job_string === 'hash_movie') {
      const job_data = this.buildHashJobData(extra_data)
      this.props.submitJob({
        job_data:job_data, 
        after_submit: () => {this.setMessage('movie hash job was submitted')}, 
        cancel_after_loading: true, 
        after_loaded: () => {this.setMessage('movie hash completed')}, 
        when_failed: () => {this.setMessage('movie hash failed')},
      })
    } else if (job_string === 'copy_movie') {
      const job_data = this.buildCopyJobData(extra_data)
      this.props.submitJob({
        job_data:job_data, 
        after_submit: () => {this.setMessage('movie copy job was submitted')}, 
        cancel_after_loading: true, 
        after_loaded: () => {this.setMessage('movie copy completed')}, 
        when_failed: () => {this.setMessage('movie copy failed')},
      })
    } else if (job_string === 'change_movie_resolution') {
      if (!this.state.movie_resolution_new) {
        this.setMessage('no resolution specified, please specify one first')
        return
      }
      const job_data = this.buildChangeResolutionJobData(extra_data)
      this.props.submitJob({
        job_data:job_data, 
        after_submit: () => {this.setMessage('movie change resolution was submitted')}, 
        cancel_after_loading: true, 
        after_loaded: () => {this.setMessage('movie change resolution completed')}, 
        when_failed: () => {this.setMessage('movie change resolution failed')},
      })
    } else if (job_string === 'redact_framesets') {
      const job_data = this.buildRedactFramesetsJobData(extra_data)
      this.props.submitJob({
        job_data: job_data, 
        after_submit: () => {this.setMessage('redact frames job was submitted')}, 
        cancel_after_loading: true, 
        after_loaded: () => {this.setMessage('frameset redactions completed')}, 
        when_failed: () => {this.setMessage('redact frames job failed')},
      })
    } else if (job_string === 'template_match') {
      const job_data = this.buildTemplateMatchJobdata(extra_data)
      this.props.submitJob({
        job_data: job_data, 
        after_submit: () => {this.setMessage('template match job was submitted')}, 
        cancel_after_loading: true, 
        after_loaded: () => {this.setMessage('template match completed')}, 
        when_failed: () => {this.setMessage('template match job failed')},
      })
    } else if (job_string === 'template_match_all_templates') {
      const job_data = this.buildTemplateMatchJobdata('all_templates')
      this.props.submitJob({
        job_data: job_data, 
        after_submit: () => {this.setMessage('template match job was submitted')}, 
        cancel_after_loading: true, 
        after_loaded: () => {this.setMessage('template match completed')}, 
        when_failed: () => {this.setMessage('template match job failed')},
      })
    } else if (job_string === 'zip_movie') {
      const job_data = this.buildZipMovieJobdata(extra_data)
      this.props.submitJob({
        job_data: job_data, 
        after_submit: () => {this.setMessage('zip movie job was submitted')}, 
        cancel_after_loading: true, 
        after_loaded: () => {this.setMessage('movie zip completed')}, 
        when_failed: () => {this.setMessage('zip movie job failed')},
      })
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
    this.props.setFramesetHash(frameset_hash)
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
    if (this.state.uploadMovie) {
      return
    }
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

  handleDroppedMovie(event) {
    event.preventDefault()
    event.stopPropagation()
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      for (let i=0; i < event.dataTransfer.files.length; i++) {
        this.handleDownloadedFile(event.dataTransfer.files[i])
      }
    }
  }

  async handleDownloadedFile(the_file) {
    let reader = new FileReader()
    let app_this = this
    reader.onload = function(e) {
      app_this.props.postMakeUrlCall({
        data_uri: e.target.result,
        filename: the_file.name,
        when_done: app_this.props.establishNewMovie,
        when_failed: (err) => {app_this.setMessage('make url job failed')}, 
      })
    }
    reader.readAsDataURL(the_file)
    this.setState({
      uploadMovie: false,
    })
  }

  buildMovieUploadTarget() {
    if (this.state.uploadMovie) {
      let top_style = {
        height: '270px',
        'borderStyle': 'dashed',
        'borderColor': '#CCCCCC',
        'color': '#888888',
        'textAlign': 'center',
        'paddingTop': '90px',
        'fontSize': '36px',
      }
      return (
        <div 
          className='col-md-6'
          style={top_style}
          draggable='true'
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => this.handleDroppedMovie(event)}
        >
          Drag movies here to begin work
        </div>
      )
    }
  }

  render() {
    const image_zoom_modal = this.buildImageZoomModal()
    const video_div = this.buildVideoDiv()
    const redacted_video_div = this.buildRedactedVideoDiv()
    const framesets_title = this.buildFramesetsTitle()
    const movie_upload_target = this.buildMovieUploadTarget()

    return (
    <div>

      {image_zoom_modal}

      <div id='movie_parser_panel'>
        <div id='video_and_meta' className='row'>
          <div id='video_meta_div' className='col-md-12'>
            <MoviePanelHeader
              callMovieSplit={this.callMovieSplit}
              message={this.state.message}
              submitMovieJob={this.submitMovieJob}
              movie_url={this.props.movie_url}
              templates={this.props.templates}
              showMovieUploadTarget={this.showMovieUploadTarget}
            />
          </div>

          {movie_upload_target}
          {video_div}
          {redacted_video_div}

          <MoviePanelAdvancedControls
            movie_url={this.props.movie_url}
            movies={this.props.movies}
            setMessage={this.setMessage}
            getRedactedMovieUrl={this.props.getRedactedMovieUrl}
            setGlobalStateVar={this.props.setGlobalStateVar}
            toggleGlobalStateVar={this.props.toggleGlobalStateVar}
            submitMovieJob={this.submitMovieJob}
            mask_method={this.props.mask_method}
            frameset_discriminator={this.props.frameset_discriminator}
            changeMovieResolutionNew={this.changeMovieResolutionNew}
            movie_resolution_new={this.state.movie_resolution_new}
            preserve_movie_audio={this.props.preserve_movie_audio}
            frameset_offset_seconds={this.state.frameset_offset_seconds}
            frameset_offset_minutes={this.state.frameset_offset_minutes}
            changeFramesetOffsetSeconds={this.changeFramesetOffsetSeconds}
            changeFramesetOffsetMinutes={this.changeFramesetOffsetMinutes}
            findFramesetAtOffset={this.findFramesetAtOffset}
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
                getImageFromFrameset={this.props.getImageFromFrameset}
                getRedactedImageFromFrameset={this.props.getRedactedImageFromFrameset}
                highlighted_frameset_hash={this.state.highlighted_frameset_hash}
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
            value={this.props.frameset_discriminator}
            onChange={(event) => 
              this.props.setGlobalStateVar(
                'frameset_discriminator',
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

  buildSplitButton() {
    return (
      <button className='btn btn-primary'
          key='5558'
          onClick={() => this.props.submitMovieJob('split_movie')}
          href='.'>
        Split Movie
      </button>
    )
  }

  buildHashButton() {
    return (
      <button className='btn btn-primary'
          key='5559'
          onClick={() => this.props.submitMovieJob('hash_movie')}
          href='.'>
        Hash Movie
      </button>
    )
  }

  buildCopyButton() {
    return (
      <button className='btn btn-primary'
          key='5279'
          onClick={() => this.props.submitMovieJob('copy_movie')}
          href='.'>
        Copy Movie
      </button>
    )
  }

  buildChangeResolutionButton() {
    return (
      <div>
        <div className='d-inline'>
          Change Resolution
        </div>

        <div className='d-inline ml-2'>
          <select
              name='movie_resolution'
              value={this.props.movie_resolution_new}
              onChange={(event) => this.props.changeMovieResolutionNew(event.target.value)}
          >
            <option value=''></option>
            <option value='1920x1080'>1920x1080</option>
            <option value='1600x900'>1600x900</option>
          </select>
        </div>

        <div className='d-inline ml-2'>
          <button className='btn btn-primary'
              key='4294'
              onClick={() => this.props.submitMovieJob('change_movie_resolution')}
              href='.'>
            Go
          </button>
        </div>
      </div>
    )
  }

  buildPreserveMovieAudioCheckbox() {
    let checked_state = ''
    if (this.props.preserve_movie_audio) {
      checked_state = 'checked'
    }
    return (
      <div className='row mt-3 bg-light rounded'>
        <input
          className='ml-2 mr-2 mt-1'
          id='toggle_preserve_movie_audio'
          checked={checked_state}
          type='checkbox'
          onChange={(event) => this.props.toggleGlobalStateVar('preserve_movie_audio')}
        />
        Preserve Movie Audio
      </div>
    )
  }

  buildFindFramesetAtOffsetButton() {
    let sixty_element_array = []
    for (let i = 0; i < 61; i++) {
      sixty_element_array.push(i)
    }
    let prev_offset = 0
    const cur_offset_sec = parseInt(this.props.frameset_offset_seconds)
    const cur_offset_min = parseInt(this.props.frameset_offset_minutes) * 60
    const cur_offset = cur_offset_sec + cur_offset_min
    if (cur_offset > 0) {
      prev_offset = cur_offset - 1
    }
    const next_offset = cur_offset + 1
    return (
      <div>
        <div className='d-inline'>
          Highlight Frameset at Offset
        </div>

        <div className='d-inline ml-2'>
          <select
              name='frameset_offset_minutes'
              value={this.props.frameset_offset_minutes}
              onChange={(event) => this.props.changeFramesetOffsetMinutes(event.target.value)}
          >
            {sixty_element_array.map((value, index) => {
              const key = 'frameset_offst_minutes_' + index.toString()
              return (
                <option key={key} value={value}>{value}</option>
              )
            })}
          </select>
        </div>
        <div className='d-inline ml-1'>
          min
        </div>

        <div className='d-inline ml-2'>
          <select
              name='frameset_offset_seconds'
              value={this.props.frameset_offset_seconds}
              onChange={(event) => this.props.changeFramesetOffsetSeconds(event.target.value)}
          >
            {sixty_element_array.map((value, index) => {
              const key = 'frameset_offst_seconds_' + index.toString()
              return (
                <option key={key} value={value}>{value}</option>
              )
            })}
          </select>
        </div>
        <div className='d-inline ml-1'>
          sec
        </div>

        <div className='d-inline ml-2'>
          <button className='btn btn-primary'
              key='find_frameset_at_offset_go_button'
              onClick={() => this.props.findFramesetAtOffset(cur_offset)}
              href='.'>
            Go
          </button>
          <button className='btn btn-primary ml-2'
              key='find_frameset_at_offset_prev_button'
              onClick={() => this.gotoOffsetAndSet(prev_offset)}
              href='.'>
            Prev
          </button>
          <button className='btn btn-primary ml-2'
              key='find_frameset_at_offset_next_button'
              onClick={() => this.gotoOffsetAndSet(next_offset)}
              href='.'>
            Next
          </button>
        </div>
      </div>
    )
  }

  gotoOffsetAndSet(the_offset) {
    this.props.findFramesetAtOffset(the_offset)
    const offset_sec = the_offset % 60
    const offset_min = Math.floor(the_offset / 60)
    this.props.changeFramesetOffsetSeconds(offset_sec)
    this.props.changeFramesetOffsetMinutes(offset_min)
  }

  render() {
    if (this.props.movie_url === '') {
      return ''
    }
    let frameset_discriminator = ''
    let runtime = '0:00'
    let nickname = ''
    let num_framesets = '0'
    let num_frames = '0'
    let redacted = 'No'
    let frame_dimensions = 'unknown'
    let templates_string = this.buildTemplatesString()
    const split_button = this.buildSplitButton()
    const hash_button = this.buildHashButton()
    const copy_button = this.buildCopyButton()
    const change_button = this.buildChangeResolutionButton()
    const redacted_movie_dl_link = this.buildRedactedMovieDownloadLink()
    const preserve_movie_audio_checkbox = this.buildPreserveMovieAudioCheckbox() 
    const find_frameset_at_offset_button = this.buildFindFramesetAtOffsetButton()

    const fd_dropdown = this.buildFramesetDiscriminatorDropdown()
    if (this.props.movie_url && Object.keys(this.props.movies).includes(this.props.movie_url)) {
      const movie = this.props.movies[this.props.movie_url]
      frameset_discriminator = movie['frameset_discriminator']
      num_frames = movie['frames'].length
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
              +/-
            </button>
          </div>
        </div>

        <div
            id='advanced_body'
            className='row collapse'
        >
          <div id='advanced_main' className='col ml-3'>
            <div id='movie_info_div m-2'>
              <div>Movie Url: {this.props.movie_url}</div>
              <div>Nickname: {nickname}</div>
              <div>Number of frames: {num_frames.toString()}</div>
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
                    value={this.props.mask_method}
                    onChange={(event) => this.props.setGlobalStateVar('mask_method', event.target.value)}
                >
                  <option value='blur_7x7'>--- Mask Method ---</option>
                  <option value='blur_7x7'>Gaussian Blur 7x7</option>
                  <option value='blur_21x21'>Gaussian Blur 21x21</option>
                  <option value='blur_median'>Median Blur</option>
                  <option value='black_rectangle'>Black Rectangle</option>
                  <option value='green_outline'>Green Outline</option>
                </select>
              </div>
              <div className='mt-2'>
                <div className='d-inline'>
                  {split_button}
                </div>
                <div className='d-inline ml-2'>
                  {hash_button}
                </div>
                <div className='d-inline ml-2'>
                  {copy_button}
                </div>
              </div>

              <div className='mt-2 ml-2'>
                {change_button}
              </div>
              <div className='mt-2 ml-2'>
                {find_frameset_at_offset_button}
              </div>
              <div className='mt-2 ml-2'>
                {preserve_movie_audio_checkbox}
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
    if (this.props.movie_url === '') {
      return ''
    }
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
          <button className='dropdown-item ml-2'
              key='template_match_all_templates_key'
              onClick={() => this.props.submitMovieJob('template_match_all_templates')}
              href='.'>
            Run all templates
          </button>
        </div>
      </div>
    )
  }

  buildMessage() {
      if (this.props.message === '.') {
      let style = {
        color: '#FFFFFF',
      }
      return (
        <div
          style={style}
        >
          {this.props.message}
        </div>
      )
    } else {
      return this.props.message
    }
  }

  buildSplitButton() {
    if (this.props.movie_url === '') {
      return ''
    }
    return (
      <button 
          id='parse_video_button'
          className='btn btn-primary' 
          onClick={() => this.props.submitMovieJob('split_and_hash_video', this.props.movie_url)}
      >
        Split and Hash
      </button>
    )
  }

  buildRedactButton() {
    if (this.props.movie_url === '') {
      return ''
    }
    return (
      <button 
          id='parse_video_button'
          className='btn btn-primary ml-2' 
          onClick={() => this.props.submitMovieJob('redact_framesets')}
      >
        Redact All Frames
      </button>
    )
  }

  buildReassembleButton() {
    if (this.props.movie_url === '') {
      return ''
    }
    return (
      <button 
          id='reassemble_video_button'
          className='btn btn-primary ml-2' 
          onClick={() => this.props.submitMovieJob('zip_movie')}
      >
        Reassemble Video
      </button>
    )
  }

  buildNewButton() {
    return (
      <button 
          className='btn btn-primary ml-2' 
          onClick={() => this.props.showMovieUploadTarget()}
      >
        New
      </button>
    )
  }

  render() {
    let templates_button = this.buildTemplateButton()
    let message = this.buildMessage()
    let split_button = this.buildSplitButton()
    let redact_button = this.buildRedactButton()
    let reassemble_button = this.buildReassembleButton()
    let new_button = this.buildNewButton()

    return (
      <div>
        <div className='row m-2'>
          {split_button}

          {templates_button}

          {redact_button}

          {reassemble_button}

          {new_button}

        </div>
        <div className='row'>
          <div 
              id='movieparser_status'
              className='col-md-6 mt-2'
          >
            {message}
          </div>
        </div>
      </div>
    )
  }
}

export default MoviePanel;
