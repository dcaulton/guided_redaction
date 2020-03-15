import React from 'react'

class ComposePanel extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      compose_image: '',
      compose_display_image: '',
      image_width: 1000,
      image_height: 1000,
      compose_image_scale: 1,
      movie_offset_string: '',
      dragged_type: '',
      dragged_id: '',
      message: '',
    }
    this.scrubberOnChange=this.scrubberOnChange.bind(this)
    this.removeSequenceFrame=this.removeSequenceFrame.bind(this)
    this.gotoSequenceFrame=this.gotoSequenceFrame.bind(this)
    this.setSubsequences=this.setSubsequences.bind(this)
    this.setDraggedItem=this.setDraggedItem.bind(this)
    this.handleDroppedOntoSubsequence=this.handleDroppedOntoSubsequence.bind(this)
    this.handleDroppedOntoSequence=this.handleDroppedOntoSequence.bind(this)
    this.moveSequenceFrameUp=this.moveSequenceFrameUp.bind(this)
    this.moveSequenceFrameDown=this.moveSequenceFrameDown.bind(this)
    this.deleteSubsequence=this.deleteSubsequence.bind(this)
    this.generateSubsequence=this.generateSubsequence.bind(this)
    this.previewSubsequence=this.previewSubsequence.bind(this)
  }

  componentDidMount() {
    this.scrubberOnChange()
  }

  setMessage(the_message) {
    this.setState({
      message: the_message,
    })
  }

  previewSubsequence(subsequence_id) {
    const subsequence = this.props.subsequences[subsequence_id]
    this.setState({
      compose_image: subsequence['name'],
      compose_display_image: subsequence['rendered_image'],
    })
  }

  generateSubsequence(subsequence_id) {
    this.submitComposeJob('render_subsequence', subsequence_id)
  }

  buildRenderSubsequenceJobData(extra_data) {
    let job_data = {
      request_data: {},
    }
    const subsequence_id = extra_data
    const subsq_name = this.props.subsequences[subsequence_id]['name']
    job_data['app'] = 'parse'
    job_data['operation'] = 'render_subsequence'
    job_data['description'] = 'render subsequence from ComposePanel: subsequence ' + subsq_name
    job_data['request_data'] = {
      subsequence: this.props.subsequences[subsequence_id],
    }
    return job_data
  }

  submitComposeJob(job_string, extra_data = '') {
    if (job_string === 'render_subsequence') {
      const job_data = this.buildRenderSubsequenceJobData(extra_data)
      this.props.submitJob({
        job_data:job_data,
        after_submit: () => {this.setMessage('render subsequence job was submitted')},
        cancel_after_loading: true,
        after_loaded: () => {this.setMessage('render subsequence completed')},
        when_failed: () => {this.setMessage('render subsequence failed')},
      })
    }
  }

  setDraggedItem(the_type, the_id) {
    this.setState({
      dragged_type: the_type,
      dragged_id: the_id,
    })
  }

  deleteSubsequence(subsequence_id) {
    let deepCopySubsequences = JSON.parse(JSON.stringify(this.props.subsequences))
    delete deepCopySubsequences[subsequence_id]
    this.setState({
      subsequences: deepCopySubsequences,
    })
  }

  moveSequenceFrameUp(image_url) {
    let deepCopyMovies = JSON.parse(JSON.stringify(this.props.movies))
    let movie = JSON.parse(JSON.stringify(deepCopyMovies['sequence']))
    if (movie['frames'].indexOf(image_url) === 0) {
      return
    }
    let cur_index = movie['frames'].indexOf(image_url)
    let cur_frame = JSON.parse(JSON.stringify(movie['frames'][cur_index]))
    let cur_frameset = JSON.parse(JSON.stringify(movie['framesets'][cur_index]))
    movie['frames'][cur_index] = movie['frames'][cur_index-1]
    movie['framesets'][cur_index] = movie['framesets'][cur_index-1]
    movie['frames'][cur_index-1] = cur_frame
    movie['framesets'][cur_index-1] = cur_frameset
    deepCopyMovies['sequence'] = movie
    this.props.setGlobalStateVar('movies', deepCopyMovies)
    this.scrubberOnChange()
  }

  moveSequenceFrameDown(image_url) {
    let deepCopyMovies = JSON.parse(JSON.stringify(this.props.movies))
    let movie = JSON.parse(JSON.stringify(deepCopyMovies['sequence']))
    if (movie['frames'].indexOf(image_url) === movie['frames'].length - 1) {
      return
    }
    let cur_index = movie['frames'].indexOf(image_url)
    let cur_frame = JSON.parse(JSON.stringify(movie['frames'][cur_index]))
    let cur_frameset = JSON.parse(JSON.stringify(movie['framesets'][cur_index]))
    movie['frames'][cur_index] = movie['frames'][cur_index+1]
    movie['framesets'][cur_index] = movie['framesets'][cur_index+1]
    movie['frames'][cur_index+1] = cur_frame
    movie['framesets'][cur_index+1] = cur_frameset
    deepCopyMovies['sequence'] = movie
    this.props.setGlobalStateVar('movies', deepCopyMovies)
    this.scrubberOnChange()
  }

  handleDroppedOntoSubsequence(subsequence_id) {
    if (this.state.dragged_type === 'sequence') {
      let deepCopySubsequences = JSON.parse(JSON.stringify(this.props.subsequences))
      deepCopySubsequences[subsequence_id]['images'].push(this.state.dragged_id)
      const new_num_sequence_frames = this.getSequence()['frames'].length - 1
      this.setSubsequences(deepCopySubsequences)
      setTimeout(this.removeSequenceFrame(this.state.dragged_id), 500)
      this.setScrubberMax(new_num_sequence_frames) 
      this.scrubberOnChange()
    }
  }

  handleDroppedOntoSequence() {
    console.log('someone just dropped on to the main sequence')
  }

  setSubsequences(the_subsequences) {
    this.props.setGlobalStateVar('subsequences', the_subsequences)
  }

  setScrubberMax(the_number) {
    document.getElementById('compose_scrubber').max = the_number
  }

  gotoSequenceFrame(frame_url_to_goto) {
    const movie = this.props.movies[this.props.movie_url]
    if (movie['frames'].includes(frame_url_to_goto)) {
      const index = movie['frames'].indexOf(frame_url_to_goto)
      document.getElementById('compose_scrubber').value = index
      this.scrubberOnChange()
    }
  }

  removeSequenceFrame(frame_url_to_delete) {
    let deepCopyMovies = JSON.parse(JSON.stringify(this.props.movies))
    let movie = JSON.parse(JSON.stringify(deepCopyMovies['sequence']))
    let build_frames = []
    let build_framesets = {}
    for (let i=0; i < movie['frames'].length; i++) {
      const frame_url = movie['frames'][i]
      const frameset_hash = this.props.getFramesetHashForImageUrl(frame_url, movie['framesets'])
      const old_frameset = JSON.parse(JSON.stringify(movie['framesets'][frameset_hash]))
      const new_hash = Math.floor(Math.random(1000000, 9999999)*1000000000).toString()
      if (frame_url !== frame_url_to_delete) {
        build_frames.push(frame_url)
        build_framesets[new_hash] = old_frameset
      }
    }
    movie['frames'] = build_frames
    movie['framesets'] = build_framesets
    deepCopyMovies['sequence'] = movie
    this.props.setGlobalStateVar('movies', deepCopyMovies)
    const num_frames = movie['frames'].length
    this.setScrubberMax(num_frames)
    if (this.props.movie_url === 'sequence') { // set scrubber to 0 to be sure we're in range
      document.getElementById('compose_scrubber').value = 0
      this.scrubberOnChange()
    }
  }

  updateMovieOffset(offset_in_seconds) {
    if (!this.props.movie_url) {
      return
    }
    const mins_offset = Math.floor(parseInt(offset_in_seconds) / 60)
    const secs_offset = parseInt(offset_in_seconds) % 60
    const secs_string = secs_offset.toString()
    const build_string = 'position ' + mins_offset.toString() + ':' + secs_string.padStart(2, '0')
    this.setState({
      movie_offset_string: build_string,
    })
  }

  scrubberOnChange() {
    const frames = this.props.getCurrentFrames()
    if (!frames) {
      this.setState({
        compose_image: '',
        compose_display_image: '',
      })
      return
    }
    const value = document.getElementById('compose_scrubber').value
    const the_url = frames[value]
    const frameset_hash = this.props.getFramesetHashForImageUrl(the_url)
    const the_display_url = this.props.getImageUrl(frameset_hash)
    this.setState({
      compose_image: the_url,
      compose_display_image: the_display_url,
    }, this.setImageSize(the_url))
    this.updateMovieOffset(value)
  }

  setImageSize(the_image) {
    var app_this = this
    if (the_image) {
      let img = new Image()
      img.src = the_image
      img.onload = function() {
        app_this.setState({
          image_width: this.width,
          image_height: this.height,
        }, app_this.setImageScale()
        )
      }
    }
  }

  setImageScale() {
    const scale = (document.getElementById('compose_image').width /
        document.getElementById('compose_image').naturalWidth)
    this.setState({
      compose_image_scale: scale,
    })
  }

  getImageOffsetHeight() {
    let bottom_y = 0
    if (this.state.compose_image) {
      bottom_y += document.getElementById('compose_image').offsetHeight
    }
    return bottom_y
  }

  getMaxRange() {
    if (!this.props.movies || !this.props.movie_url) {
      return 1
    }
    const movie = this.props.movies[this.props.movie_url]
    const max_len = movie['frames'].length - 1
    return max_len
  }

  getSequence() {
    if (Object.keys(this.props.movies).includes('sequence')) {
      return this.props.movies['sequence']
    }
  }

  captureFrame() {
    if (!Object.keys(this.props.movies).includes('sequence')) {
      this.props.establishNewEmptyMovie('sequence', false)
      setTimeout(
        (()=>{this.props.addImageToMovie({
          url: this.state.compose_image,
          movie_url: 'sequence',
        })}), 1000)
    } else {
      this.props.addImageToMovie({
        url: this.state.compose_image,
        movie_url: 'sequence',
      })
    }
  }

  gotoRedaction() {
    this.props.setGlobalStateVar('movie_url', 'sequence')
    const sequence = this.getSequence()
    this.props.setFramesetHash('1', sequence['framesets'])
    document.getElementById('image_panel_link').click()
  }

  buildCaptureButton() {
    return (
      <button
          className='btn btn-primary'
          onClick={() => this.captureFrame()}
      >
        Capture
      </button>
    )
  }

  buildGotoRedactionButton() {
    const sequence_movie = this.getSequence()
    if (!sequence_movie || !sequence_movie['frames'].length) {
      return ''
    }
    return (
      <button
          className='btn btn-primary ml-2'
          onClick={() => this.gotoRedaction()}
      >
        Goto Redaction
      </button>
    )
  }

  buildWhenDoneLink() {
    if (this.state.compose_image === '') {
      return ''
    }
    if (this.props.whenDoneTarget) {
      return (
        <button
            className='btn btn-primary ml-2'
            onClick={() => this.props.gotoWhenDoneTarget()}
        >
          Goto Precision Learning
        </button>
      )
    }
  }

  buildNotLoadedMessage() {
    if (!this.props.movie_url) {
      return (
        <div>
          <div className='col-lg-9'>
            <div className='h1 mt-5 text-center'>
              movie not loaded
            </div>
            <div className='ml-5 mr-5'>
               <div className='h4'>
                 Your movie may still be unzipping or there may have been a problem
                 retrieving it.  To fetch a movie from secure files on your own: 
               </div>
               <ul>
                 <li>
                   Go to the Insights tab on the top of this page
                 </li>
                 <li>
                   If you see a new card in the Videos column on the left with the name of your movie, 
                   and you see a card in the Jobs column on the right which says 'split and hash threaded', 
                   and the job card has has a big label that says 'running', then your movie is still being split, 
                   if you go back to the Compose tab and wait, the movie will appear when it is ready
                 </li>
                 <li>
                   If you don't see the Movie and Job cards, then expand the file system section towards the bottom
                   of the page
                 </li>
                 <li>
                   In the 'Import from secure files' section, specify your recording Id and press Go
                 </li>
                 <li>
                   You will soon see a new card in the Videos column on the left.  Press the 'split' link on 
                   that card.  It may take a minute or two to split
                 </li>
                 <li>
                   Then return to this page by pressing the Compose tab on top
                 </li>
               </ul>
            </div>
          </div>
        </div>
      )
    }
  }

  setMovie(movie_url) {
    this.props.setGlobalStateVar('movie_url', movie_url)
    const movie = this.props.movies[movie_url]
    const num_frames = movie['frames'].length
    this.setScrubberMax(num_frames)
    document.getElementById('compose_scrubber').value = 0
    this.scrubberOnChange()
  }

  buildViewDropdown() {
    if (!this.props.movie_url) {
      return ''
    }
    const movie_urls = []
    for (let i=0; i < Object.keys(this.props.movies).length; i++) {
      const movie_url = Object.keys(this.props.movies)[i]
      if (movie_url !== 'sequence') {
        movie_urls.push(movie_url)
      }
    }
    return (
      <div className='d-inline'>
        <div className='d-inline ml-4'>
          View
        </div>
        <div className='d-inline ml-2'>
          <select
              name='compose_panel_movie_to_view'
              value={this.props.movie_url}
              onChange={(event) => this.setMovie(event.target.value)}
          >
            <option value='sequence'>Sequence</option>
            {movie_urls.map((movie_url, index) => {                            
              const short_name = 'Movie ' + movie_url.split('/').slice(-1)[0]
              return (
                <option key={index} value={movie_url}>{short_name}</option>
              )
            })}
          </select>
        </div>
      </div>
    )
  }

  buildComposeMessage() {
    if (!this.props.movie_url) {
      return ''
    }
    if (!this.state.message) {
      return '.'
    }
    return this.state.message
  }

  render() {
    const not_loaded_message = this.buildNotLoadedMessage()
    const capture_button = this.buildCaptureButton()
    const goto_redaction_button = this.buildGotoRedactionButton()
    const when_done_link = this.buildWhenDoneLink()
    const max_range = this.getMaxRange()
    const view_dropdown = this.buildViewDropdown()
    const compose_message = this.buildComposeMessage()
    let imageDivStyle= {
      width: this.props.image_width,
      height: this.props.image_height,
    }
    let the_display='block'
    let image_bottom_y = this.getImageOffsetHeight()
    if (!this.state.compose_image) {
      the_display='none'
    }
    const image_offset_style = {
      display: the_display,
      top: image_bottom_y,
    }
    return (
      <div id='compose_panel_container'>
        <div id='compose_panel'>
          <div id='compose_header' className='row position-relative mt-2 mb-2' >
            <div className='col'>
              {not_loaded_message}
              <div className='row' >
                {this.state.movie_offset_string}
                {view_dropdown}
              </div>
              <div className='row' >
                {compose_message}
              </div>
            </div>
          </div>

          <div id='compose_movie_and_scrubber_div' className='row position-relative'>
            <div className='col-lg-9 ml-0 mr-0 pl-0 pr-0'>
              <div 
                  id='compose_image_div' 
                  className='row position-absolute'
                  style={imageDivStyle}

              >
                <img
                    id='compose_image'
                    className='p-0 m-0 mw-100 mh-100'
                    src={this.state.compose_display_image}
                    alt={this.state.compose_display_image}
                />
              </div>
              <div
                  id='compose_scrubber_div'
                  className='row position-relative mr-0 ml-0 pl-0 pr-0'
                  style={image_offset_style}
              >
                <input
                    id='compose_scrubber'
                    type='range'
                    max={max_range}
                    defaultValue='0'
                    onChange={this.scrubberOnChange}
                />
              </div>
            </div>
          </div>

          <div 
              id='compose_movie_footer' 
              className='row position-relative mt-2'
              style={image_offset_style}
          >
            <div className='col' >
              {capture_button}
              {goto_redaction_button}
              {when_done_link}
            </div>
          </div>

          <div 
              id='sequence_area' 
              className='row position-relative'
              style={image_offset_style}
          >
            <SequenceAndSubsequencePanel
              sequence_movie={this.getSequence()}
              removeSequenceFrame={this.removeSequenceFrame}
              gotoSequenceFrame={this.gotoSequenceFrame}
              compose_image={this.state.compose_image}
              subsequences={this.props.subsequences}
              setSubsequences={this.setSubsequences}
              setDraggedItem={this.setDraggedItem}
              handleDroppedOntoSubsequence={this.handleDroppedOntoSubsequence}
              handleDroppedOntoSequence={this.handleDroppedOntoSequence}
              moveSequenceFrameUp={this.moveSequenceFrameUp}
              moveSequenceFrameDown={this.moveSequenceFrameDown}
              deleteSubsequence={this.deleteSubsequence}
              generateSubsequence={this.generateSubsequence}
              previewSubsequence={this.previewSubsequence}
            />
          </div>
         
        </div>
      </div>
    );
  }
}

class SequenceAndSubsequencePanel extends React.Component {
  createSubsequence() {
    let deepCopySubsequences = JSON.parse(JSON.stringify(this.props.subsequences))
    const subsequence_id = 'subsequence_' + Math.floor(Math.random(1000000, 9999999)*1000000000).toString()
    const new_subsequence = {
      id: subsequence_id,
      images: [],
      delay: 1000,
    }
    deepCopySubsequences[subsequence_id] = new_subsequence
    this.props.setSubsequences(deepCopySubsequences)
  }

  createSubsequenceLink() {
    return (
      <button
        className='border-0 text-primary'
        onClick={() => this.createSubsequence(this.props.frame_url)}
      >
        create subsequence
      </button>

    )
  }

  createSubsequencePanel() {
    const subsequence_movie_ids = Object.keys(this.props.subsequences)
    if (!subsequence_movie_ids.length) {
      return ''
    }
    return (
      <div className='col-lg-4'>
        <div className='h4'>
          subsequences:
        </div>
        <div id='subsequence_card_wrapper'>
          {subsequence_movie_ids.map((subsequence_id, index) => {
            const subsequence = this.props.subsequences[subsequence_id]
            return (
            <SubsequenceCard
              subsequence={subsequence}
              key={index}
              subsequences={this.props.subsequences}
              setSubsequences={this.props.setSubsequences}
              setDraggedItem={this.props.setDraggedItem}
              handleDroppedOntoSubsequence={this.props.handleDroppedOntoSubsequence}
              deleteSubsequence={this.props.deleteSubsequence}
              generateSubsequence={this.props.generateSubsequence}
              previewSubsequence={this.props.previewSubsequence}
            />
            )
          })}
       </div>
      </div>
    )
  }

  render() {
    if (!this.props.sequence_movie) {
      return ''
    }
    const sequence_movie_frames = this.props.sequence_movie['frames']
    const create_subsequence_link = this.createSubsequenceLink()
    const subsequence_panel = this.createSubsequencePanel()
    return (
      <div className='col border-top mt-2'>
        <div className='row'>
          <div className='col-lg-10 h3'>
            main sequence
          </div>
          <div className='col-lg-2'>
            {create_subsequence_link}
          </div>
        </div>

        <div className='row'>
          <div className='col-lg-8'>
            <div id='sequence_card_wrapper'>
              {sequence_movie_frames.map((frame_url, index) => {
                return (
                <SequenceCard
                  frame_url={frame_url}
                  key={index}
                  sequence_movie={this.props.sequence_movie}
                  removeSequenceFrame={this.props.removeSequenceFrame}
                  gotoSequenceFrame={this.props.gotoSequenceFrame}
                  compose_image={this.props.compose_image}
                  setDraggedItem={this.props.setDraggedItem}
                  handleDroppedOntoSequence={this.props.handleDroppedOntoSequence}
                  moveSequenceFrameUp={this.props.moveSequenceFrameUp}
                  moveSequenceFrameDown={this.props.moveSequenceFrameDown}
                />
                )
              })}
            </div>
          </div>

          {subsequence_panel}

        </div>
      </div>
    )
  }
}

class SequenceCard extends React.Component {
  getIsCurrentImageIndicator() {
    if (this.props.frame_url === this.props.compose_image) {
      return '*'
    }
    return ''
  }

  buildRemoveLink() {
    return (
      <button
        className='border-0 text-primary'
        onClick={() => this.props.removeSequenceFrame(this.props.frame_url)}
      >
        remove
      </button>
    )
  }

  buildGotoLink() {
    return (
      <button
        className='border-0 text-primary'
        onClick={() => this.props.gotoSequenceFrame(this.props.frame_url)}
      >
        goto
      </button>
    )
  }

  buildUpLink() {
    return (
      <button
        className='border-0 text-primary'
        onClick={() => this.props.moveSequenceFrameUp(this.props.frame_url)}
      >
        up
      </button>
    )
  }

  buildDownLink() {
    return (
      <button
        className='border-0 text-primary'
        onClick={() => this.props.moveSequenceFrameDown(this.props.frame_url)}
      >
        down
      </button>
    )
  }

  buildFrameName() {
    return this.props.frame_url.split('/').slice(-1)[0]
  }

  render() {
    const frame_name = this.buildFrameName()
    const is_current_indicator = this.getIsCurrentImageIndicator() 
    const remove_link = this.buildRemoveLink()
    const goto_link = this.buildGotoLink()
    const up_link = this.buildUpLink()
    const down_link = this.buildDownLink()
    return (
    <div 
        className='sequence-card'
        draggable='true'
        onDragStart={() => this.props.setDraggedItem('sequence', this.props.frame_url)}
        onDragOver={(event) => event.preventDefault()}
        onDrop={() => this.props.handleDroppedOntoSequence()}
    >
      <div className='d-inline'>
        {frame_name}
      </div>
      <div className='d-inline ml-2'>
        {remove_link}
      </div>
      <div className='d-inline ml-2'>
        {goto_link}
      </div>
      <div className='d-inline ml-2'>
        {up_link}
      </div>
      <div className='d-inline ml-2'>
        {down_link}
      </div>
      <div className='d-inline ml-2'>
        {is_current_indicator}
      </div>
    </div>
    )
  }
}

class SubsequenceCard extends React.Component {
  buildGenerateLink() {
    return (
      <button
        className='border-0 text-primary'
        onClick={() => this.props.generateSubsequence(this.props.subsequence['id'])}
      >
        generate
      </button>
    )
  }

  buildDeleteLink() {
    return (
      <button
        className='border-0 text-primary'
        onClick={() => this.props.deleteSubsequence(this.props.subsequence['id'])}
      >
        delete
      </button>
    )
  }

  buildPreviewLink() {
    if (!Object.keys(this.props.subsequence).includes('rendered_image')) {
      return ''
    }
    return (
      <button
        className='border-0 text-primary'
        onClick={() => this.props.previewSubsequence(this.props.subsequence['id'])}
      >
        preview
      </button>
    )
  }

  setSubsequenceValue(the_id, the_field_name, the_value) {
    let deepCopySubsequences = JSON.parse(JSON.stringify(this.props.subsequences))
    deepCopySubsequences[the_id][the_field_name] = the_value
    this.props.setSubsequences(deepCopySubsequences)
  }

  buildIntervalField() {
    return (
      <div>
        <div className='d-inline'>
          interval (ms):
        </div>
        <div className='d-inline ml-2'>
          <select
              name='subsequence_interval'
              value={this.props.subsequence['interval']}
              onChange={(event) => this.setSubsequenceValue(
                  this.props.subsequence['id'], 
                  'interval', 
                  event.target.value
              )}
          >
            <option value='100'>100</option>
            <option value='200'>200</option>
            <option value='300'>300</option>
            <option value='500'>500</option>
            <option value='700'>700</option>
            <option value='1000'>1000</option>
            <option value='2000'>2000</option>
            <option value='3000'>3000</option>
            <option value='4000'>4000</option>
          </select>
        </div>
      </div>
    )
  }

  buildNameField() {
    const key_name = 'name_' + this.props.subsequence['id']
    const subseq_value=this.props.subsequence['name']
    return (
      <div>
        <div className='d-inline'>
          name:
        </div>
        <div className='d-inline'>
        <input
            className='ml-2'
            key={key_name}
            value={subseq_value}
            size='30'
            onChange={(event) => this.setSubsequenceValue(
                this.props.subsequence['id'], 
                'name', 
                event.target.value
            )}
        />
        </div>
      </div>
    )
  }

  render() {
    const generate_link = this.buildGenerateLink()
    const delete_link = this.buildDeleteLink()
    const preview_link = this.buildPreviewLink()
    const name_field = this.buildNameField()
    const interval_field = this.buildIntervalField()
    return (
      <div 
          className='row mt-2 card'
          draggable='true'
          onDragStart={() => this.props.setDraggedItem('subsequence', this.props.subsequence['id'])}
          onDragOver={(event) => event.preventDefault()}
          onDrop={() => this.props.handleDroppedOntoSubsequence(this.props.subsequence['id'])}
      >
        <div className='col p-1 ml-3'>
          <div className='row '>
            {this.props.subsequence['id']}
          </div>
          <div className='row'>
            <div className='col'>
              <div className='row mt-1'>
                {name_field}
              </div>
              <div className='row mt-1'>
                {interval_field}
              </div>
              <div className='row mt-1'>
                {generate_link}
                {delete_link}
                {preview_link}
              </div>
              <div className='row mt-1'>
                frames:
              </div>
                {this.props.subsequence['images'].map((image_url, index) => {
                  const short_name = image_url.split('/').slice(-1)[0]
                  return (
                    <div key={index} className='row'>
                      {short_name}
                    </div>
                  )
                })}
            </div>
          </div>
        </div>
      </div>
    )
  }
}

export default ComposePanel;
