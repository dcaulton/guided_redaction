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
      telemetry_section_is_built: false,
      telemetry_lines: '',
      sequence_display_mode: 'large_card',
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
    this.setSequenceDisplayMode=this.setSequenceDisplayMode.bind(this)
  }

  componentDidMount() {
    this.scrubberOnChange()
    const transaction_id = this.getTransactionId()
    if (transaction_id) {
      this.props.readTelemetryRawData(transaction_id, ((telemetry_lines)=> {
        this.setState({
          telemetry_lines: telemetry_lines,
        })
      }))
    }
  }

  setMessage(the_message) {
    this.setState({
      message: the_message,
    })
  }

  setSequenceDisplayMode(the_mode) {
    this.setState({
      sequence_display_mode: the_mode,
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
    
    let subsequence = this.props.subsequences[subsequence_id]
    let build_images = []
    for (let i=0; i < subsequence['images'].length; i++) {
      const source_image = subsequence['images'][i]
      const frameset_hash = this.props.getFramesetHashForImageUrl(source_image, subsequence['framesets'])
      const image_to_add = this.props.getImageFromFrameset(frameset_hash, subsequence['framesets'])
      build_images.push(image_to_add)
    }
    subsequence['images'] = build_images

    job_data['request_data'] = {
      subsequence: subsequence,
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
    this.setSubsequences(deepCopySubsequences)
  }

  moveSequenceFrameUp(image_url) {
    let deepCopyMovies = JSON.parse(JSON.stringify(this.props.movies))
    let movie = JSON.parse(JSON.stringify(deepCopyMovies['sequence']))
    if (movie['frames'].indexOf(image_url) === 0) {
      return
    }
    let cur_index = movie['frames'].indexOf(image_url)
    let cur_frame = movie['frames'][cur_index]
    movie['frames'][cur_index] = movie['frames'][cur_index-1]
    movie['frames'][cur_index-1] = cur_frame
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
    let cur_frame = movie['frames'][cur_index]
    movie['frames'][cur_index] = movie['frames'][cur_index+1]
    movie['frames'][cur_index+1] = cur_frame
    deepCopyMovies['sequence'] = movie
    this.props.setGlobalStateVar('movies', deepCopyMovies)
    this.scrubberOnChange()
  }

  handleDroppedOntoSubsequence(subsequence_id) {
    if (this.state.dragged_type === 'sequence') {
      let deepCopySubsequences = JSON.parse(JSON.stringify(this.props.subsequences))
      deepCopySubsequences[subsequence_id]['images'].push(this.state.dragged_id)

      const sequence = this.getSequence()
      const frameset_hash = this.props.getFramesetHashForImageUrl(this.state.dragged_id, sequence['framesets'])
      const frameset = sequence['framesets'][frameset_hash] 
      deepCopySubsequences[subsequence_id]['framesets'][frameset_hash] = frameset

      const new_num_sequence_frames = this.getSequence()['frames'].length - 1
      this.setSubsequences(deepCopySubsequences)
      setTimeout(this.removeSequenceFrame(this.state.dragged_id), 500)
      this.setScrubberMax(new_num_sequence_frames) 
      this.scrubberOnChange()
    }
  }

  handleDroppedOntoSequence() {
    if (this.state.dragged_type === 'subsequence') {
      let deepCopyMovies = JSON.parse(JSON.stringify(this.props.movies))
      let deepCopySequence = JSON.parse(JSON.stringify(deepCopyMovies['sequence']))
      const subsequence = this.props.subsequences[this.state.dragged_id]
      if (deepCopySequence['frames'].includes(subsequence['rendered_image'])) {
        return
      }
      const new_hash = Math.floor(Math.random(1000000, 9999999)*1000000000).toString()
      const frameset = {
        images: [subsequence['rendered_image']]
      }
      deepCopySequence['frames'].push(subsequence['rendered_image'])
      deepCopySequence['framesets'][new_hash] = frameset
      deepCopyMovies['sequence'] = deepCopySequence
      this.props.setGlobalStateVar('movies', deepCopyMovies)
      if (this.props.movie_url === 'sequence') {
        this.setScrubberMax(deepCopySequence['frames'].length) 
      }
    }
  }

  setSubsequences(the_subsequences) {
    this.props.setGlobalStateVar('subsequences', the_subsequences)
  }

  setScrubberMax(the_number) {
    document.getElementById('compose_scrubber').max = the_number
  }

  setScrubberValue(the_number) {
    document.getElementById('compose_scrubber').value = the_number
  }

  gotoSequenceFrame(frame_url_to_goto) {
    const movie = this.props.movies[this.props.movie_url]
    if (movie['frames'].includes(frame_url_to_goto)) {
      const index = movie['frames'].indexOf(frame_url_to_goto)
      this.setScrubberValue(index)
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
      this.setScrubberValue(0)
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
    const build_string = mins_offset.toString() + ':' + secs_string.padStart(2, '0')
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

  getMaxRange() {
    if (!this.props.movies || !this.props.movie_url || 
        (!Object.keys(this.props.movies).includes(this.props.movie_url))) {
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
    if (sequence['frames']) {
      const first_image = sequence['frames'][0]
      const first_frameset_hash = this.props.getFramesetHashForImageUrl(first_image, sequence['framesets'])
      this.props.setFramesetHash(first_frameset_hash, sequence['framesets'])
    }
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
          className='btn btn-link'
          onClick={() => this.gotoRedaction()}
      >
        Go to Redaction
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
            className='btn btn-link'
            onClick={() => this.props.gotoWhenDoneTarget()}
        >
          Go to Precision Learning
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
    if (Object.keys(movie).includes('frames')) {
      const num_frames = movie['frames'].length
      this.setScrubberMax(num_frames)
      this.setScrubberValue(0)
      this.scrubberOnChange()
      const transaction_id = this.getTransactionId(movie_url)
      if (transaction_id) {
        this.props.readTelemetryRawData(transaction_id, ((telemetry_lines)=> {
          this.setState({
            telemetry_lines: telemetry_lines,
          })
        }))
      }
    } else {
      this.setScrubberValue(0)
      this.scrubberOnChange()
    }
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
    const sequence = this.getSequence()
    let sequence_option = ''
    if (sequence && Object.keys(sequence).includes('frames')) {
      sequence_option = ( 
        <option value='sequence'>Sequence</option>
      )
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
            {sequence_option}
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

  gotoScrubberOffset(the_offset) {
    this.setScrubberValue(the_offset)
    this.scrubberOnChange()
  }

  getTransactionId(movie_url) {
    movie_url = movie_url || this.props.movie_url
    if (!this.props.telemetry_data || !Object.keys(this.props.telemetry_data).includes('movie_mappings')) {
      return
    }
    let recording_id = movie_url.split('/').slice(-1)[0]
    recording_id = recording_id.split('.')[0]
    let transaction_id = ''
    if (Object.keys(this.props.telemetry_data['movie_mappings']).includes(recording_id)) {
      transaction_id = this.props.telemetry_data['movie_mappings'][recording_id]
      return transaction_id
    } else {
      return
    }
  }

  getFirstTelemetryMinSec() {
    if (!this.state.telemetry_lines.length) {
      return 0
    }
    const datetime_regex = /\d\d\d\d-\d\d-\d\dT(\d\d):(\d\d):(\d\d)/
    const text = this.state.telemetry_lines[0]
    if (text) {
      if (text.match(datetime_regex)) {
        let mo = text.match(datetime_regex)
        return {
          minute: parseInt(mo[2]),
          second: parseInt(mo[3]),
        }
      }
    }
    return 0
  }

  buildTelemetryPicker() {
    if (!this.props.movie_url) {
      return ''
    }
    if (!this.state.telemetry_lines.length) {
      let telemetry_line_style = {
        height: "500px",
      }
      return (
      <div 
          id='telemetry_picker'
          className='col'
      >
        <div className='row h4 border-top border-bottom p-2 m-2'>
          Telemetry Data
        </div>
        <div 
            className='row overflow-auto'
            style={telemetry_line_style}
        >
        </div> 
      </div> 
      )
    }

    const telemetry_line_style = {
      'fontSize': 'small',
      'height': '500px',
    }
    const datetime_regex = /\d\d\d\d-\d\d-\d\dT(\d\d):(\d\d):(\d\d)/
    const first_telemetry = this.getFirstTelemetryMinSec()
    const movie_length_seconds = this.props.movies[this.props.movie_url]['frames'].length
    if (Object.keys(this.props.movies[this.props.movie_url]).includes('start_timestamp')) {
      const movie_timestamp = this.props.movies[this.props.movie_url]['start_timestamp']
      let mins_diff = parseInt(movie_timestamp['minute']) - first_telemetry['minute']
      if (mins_diff < 0) { 
        mins_diff += 60
      }
      let secs_diff = parseInt(movie_timestamp['second']) - first_telemetry['second']
      if (secs_diff < 0) { 
        secs_diff += 60
        mins_diff -= 1
      }
    }
    return (
      <div 
          id='telemetry_picker'
          className='col'
      >
        <div className='row h4'>
          telemetry data
        </div>
        <div 
            className='row overflow-auto'
            style={telemetry_line_style}
        >
          <div className='col'>
            {this.state.telemetry_lines.map((text, index) => {
              const eventtype_regex = /([a-f0-9-]*),([a-f0-9-]*),([a-f0-9-]*),([^,]*)/
              let line1 = ''
              if (text.match(eventtype_regex)) {
                line1 = text.match(eventtype_regex)[4]
              }
              let this_frames_offset = 0
              if (text.match(datetime_regex)) {
                let mo = text.match(datetime_regex)
                const this_frame_timestamp = {
                  minute: parseInt(mo[2]),
                  second: parseInt(mo[3]),
                }
                const this_frames_offset_timestamp = {
                  minute: this_frame_timestamp['minute'] - first_telemetry['minute'],
                  second: this_frame_timestamp['second'] - first_telemetry['second'],
                }
                if (this_frames_offset_timestamp['second'] < 0) {
                  this_frames_offset_timestamp['second'] += 60
                  this_frames_offset_timestamp['minute'] -= 1
                }
                this_frames_offset = this_frames_offset_timestamp['second'] +  60 * this_frames_offset_timestamp['minute']
              }
              const offset_message= 'offset seconds: ' + this_frames_offset.toString()
              if (this_frames_offset > movie_length_seconds) {
                return ''
              } else {
                return (
                  <div 
                      className='row border-bottom pb-2'
                      key={index}
                      title={text}
                  >
                    <div className='col'>
                      <div className='row'>
                        {line1}
                      </div>
                      <div className='row'>
                        {offset_message}
                      </div>
                      <div className='row'>
                        <button
                          className='border-0 text-primary'
                          onClick={() => this.gotoScrubberOffset(this_frames_offset)}
                        >
                          {text}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              }
            })}
          </div>
        </div>

      </div>
    )
  }

  doFetchAndSplit() {
    const rec_id = document.getElementById('recording_id').value
    if (!rec_id) {
      this.setMessage('no recording id specified, not fetching')
      return
    }
    const input_obj = {
      'recording_ids': [rec_id],
    }
    this.props.dispatchPipeline('fetch_split_hash_secure_file', 'input_json', input_obj)
    console.log('fetching recording id '+rec_id)
  }


  buildFetchAndSplit() {
    return (
      <div>
        <div className='d-inline ml-4'>
          fetch recording id
        </div>
        <div className='d-inline ml-2'>
          <input
            id='recording_id'
          />
        </div>
        <div className='d-inline ml-2'>
          <button
              className='btn btn-primary p-0'
              onClick={()=>this.doFetchAndSplit()}
          >
            Go
          </button>
        </div>
      </div>
    )
  }

  render() {
    const not_loaded_message = this.buildNotLoadedMessage()
    const capture_button = this.buildCaptureButton()
    const fetch_and_split_input = this.buildFetchAndSplit()
    const goto_redaction_button = this.buildGotoRedactionButton()
    const when_done_link = this.buildWhenDoneLink()
    const max_range = this.getMaxRange()
    const view_dropdown = this.buildViewDropdown()
    const compose_message = this.buildComposeMessage()
    const telemetry_picker = this.buildTelemetryPicker() 
    let when_done_divider = ''
    if (when_done_link && goto_redaction_button) {
      when_done_divider = '|'
    }
    let the_display='block'
    if (!this.state.compose_image) {
      the_display='none'
    }
    const image_offset_display_style = {
      display: the_display,
    }
    return (
      <div id='compose_panel_container'>
        <div className='row ml-4'>
          <div className='col-lg-6'>
            <div className='row m-2' >
                {not_loaded_message}
                {when_done_link}
                {when_done_divider}
                {goto_redaction_button}
            </div>

            <div className='row bg-light'>
              <div className='col'>
                <div className='row'>
                  <img
                      id='compose_image'
                      className='p-0 m-0 mw-100 mh-100'
                      src={this.state.compose_display_image}
                      alt={this.state.compose_display_image}
                  />
                </div>

              </div>
            </div>

            <div 
                className='row bg-light rounded border'
                style={image_offset_display_style}
            >
              <div className='col'>

                <div className='row ml-2 mt-2'>
                  {compose_message}
                </div>

                <div className='row mt-2'>
                  <input
                      id='compose_scrubber'
                      type='range'
                      max={max_range}
                      defaultValue='0'
                      onChange={this.scrubberOnChange}
                  />
                </div>

                <div className='row border-bottom m-1 pb-1'>
                  <div className='d-inline '>
                    Position: {this.state.movie_offset_string}
                  </div>
                  <div className='d-inline ml-2'>
                    {view_dropdown}
                  </div>
                </div>

                <div className='row m-2'>
                  {capture_button}
                  {fetch_and_split_input}
                </div>

              </div>
            </div>
          </div>



          <div className='col-lg-6 mh-100'>
            <div className='row mt-3 ml-2'>
              {telemetry_picker}
            </div>
          </div>

        </div>

        <div 
            id='sequence_area' 
            className='row'
            style={image_offset_display_style}
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
            sequence_display_mode={this.state.sequence_display_mode}
            setSequenceDisplayMode={this.setSequenceDisplayMode}
            movies={this.props.movies}
            movie_url={this.props.movie_url}
          />
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
      framesets: {},
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
        Create Subsequence
      </button>
    )
  }

  createSubsequencePanel() {
    const subsequence_movie_ids = Object.keys(this.props.subsequences)
    if (!subsequence_movie_ids.length) {
      return ''
    }
    return (
      <div>
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

  buildSequenceDisplayModePicker() {
    return (
      <select
          name='compose_panel_sequence_display_mode'
          value={this.props.sequence_display_mode}
          onChange={(event) => this.props.setSequenceDisplayMode(event.target.value)}
      >
        <option value='list'>display as list</option>
        <option value='large_card'>display as large cards</option>
        <option value='small_card'>display as small cards</option>
      </select>
    )
  }

  render() {
    if (!this.props.sequence_movie) {
      return ''
    }
    const sequence_movie_frames = this.props.sequence_movie['frames']
    const create_subsequence_link = this.createSubsequenceLink()
    const subsequence_panel = this.createSubsequencePanel()
    const sequence_display_mode_picker = this.buildSequenceDisplayModePicker()
    return (
      <div className='col mt-2'>
        <div className='row'>
          <div className='col-lg-7'>
            <div className='d-inline ml-4 h5'>
              Main Sequence
            </div>
            <div className='d-inline ml-2'>
              {sequence_display_mode_picker}
            </div>
          </div>
          <div className='col-lg-5 h5'>
            <div className='d-inline'>
              Subsequences
            </div>
            <div className='d-inline ml-2'>
              {create_subsequence_link}
            </div>
          </div>
        </div>

        <div className='row'>
          <div className='col-lg-7 ml-4'>
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
                  sequence_display_mode={this.props.sequence_display_mode}
                  movies={this.props.movies}
                  movie_url={this.props.movie_url}
                />
                )
              })}
            </div>
          </div>

          <div className='col-lg-3'>
            {subsequence_panel}
          </div>

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
    const movie = this.props.movies[this.props.movie_url]
    if (!movie['frames'].includes(this.props.frame_url)) {
      return ''
    }
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

  buildLinks() {
    const remove_link = this.buildRemoveLink()
    const goto_link = this.buildGotoLink()
    const up_link = this.buildUpLink()
    const down_link = this.buildDownLink()
    if (this.props.sequence_display_mode === 'small_card')  {
      return (
        <div className='bg-white'>
          <div>
            {remove_link}
            {goto_link}
          </div>
          <div>
            {up_link}
            {down_link}
          </div>
        </div>
      )
    } 
    return (
      <div className='bg-white'>
        <div>
          {remove_link}
          {goto_link}
          {up_link}
          {down_link}
        </div>
      </div>
    )
  }

  render() {
    const links_div = this.buildLinks()
    const frame_name = this.buildFrameName()
    const is_current_indicator = this.getIsCurrentImageIndicator() 
    if (this.props.sequence_display_mode === 'list')  {
    return (
      <div 
          className='sequence-card row bg-light rounded'
          draggable='true'
          onDragStart={() => this.props.setDraggedItem('sequence', this.props.frame_url)}
          onDragOver={(event) => event.preventDefault()}
          onDrop={() => this.props.handleDroppedOntoSequence()}
      >
        <div className='border-bottom pt-1 pb-1 col-lg-6'>
          {frame_name}
        </div>
        <div className='border-bottom pt-1 pb-1 col-lg-4 mr-0'>
          <div className='float-right'>
            {links_div}
          </div>
        </div>
        <div className='pt-1 pb-1 ml-0 col-lg-1'>
          {is_current_indicator}
        </div>
        <div className='col-lg-1'>
        </div>
      </div>
      )
    }
    // its a card view, default to small card
    let top_div_classname = 'd-inline-block frameCard w-25'
    if (this.props.sequence_display_mode === 'large_card')  {
      top_div_classname = 'd-inline-block frameCard w-50'
      if (is_current_indicator) {
        top_div_classname = 'd-inline-block frameCard active_card w-50'
      }
    } else if (this.props.sequence_display_mode === 'small_card')  {
      top_div_classname = 'd-inline-block frameCard w-25'
      if (is_current_indicator) {
        top_div_classname = 'd-inline-block frameCard active_card w-25'
      }
    }
    return (
      <div
          className={top_div_classname}
          draggable='true'
          onDragStart={() => this.props.setDraggedItem('sequence', this.props.frame_url)}
          onDragOver={(event) => event.preventDefault()}
          onDrop={() => this.props.handleDroppedOntoSequence()}
      >
        <div
            className='p-2 bg-light m-1'
        >
          <div className='frameset_hash'>
            {frame_name}
          </div>
          <img
              className='zoomable-image'
              src={this.props.frame_url}
              alt={this.props.frame_url}
          />
          {links_div}

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
          Name:
        </div>
        <div className='d-inline'>
        <input
            className='ml-2'
            key={key_name}
            value={subseq_value}
            size='25'
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
          className='row mt-2 card bg-light rounded'
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
