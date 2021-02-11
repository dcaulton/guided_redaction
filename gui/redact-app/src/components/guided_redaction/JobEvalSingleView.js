import React from 'react';
import CanvasAnnotateOverlay from './CanvasAnnotateOverlay'
import {
  getFileNameFromUrl
} from './redact_utils.js'

class JobEvalSingleView extends React.Component {

  buildFramesetCommentsInputRow() {
    let fs_comment = ''
    const fsh = this.props.frameset_hash
    if (
      Object.keys(this.props.jrs_movies[this.props.active_movie_url]['framesets']).includes(fsh) &&
      Object.keys(this.props.jrs_movies[this.props.active_movie_url]['framesets'][fsh]).includes('comment')
    ) {
      fs_comment = this.props.jrs_movies[this.props.active_movie_url]['framesets'][fsh]['comment']
    }
    return (
      <div className='row mt-2'>
        <div className='d-inline'>
          Frameset Comments
        </div>
        <div className='d-inline ml-2'>
          <textarea
            id='frameset_comment'
            cols='60'
            rows='3'
            value={fs_comment}
            onChange={(event) => this.setFramesetComment(event.target.value)}
          />
        </div>
      </div>
    )
  }

  setFramesetComment(comment_string) {
    let deepCopyJrsm = JSON.parse(JSON.stringify(this.props.jrs_movies))
    if (!Object.keys(this.props.jrs_movies[this.props.active_movie_url]['framesets']).includes(this.props.frameset_hash)) {
      deepCopyJrsm[this.props.active_movie_url]['framesets'][this.props.frameset_hash] = {
        desired: {},
        unwanted: {},
        pass_or_fail: '',
        comment: '',
      }
    }
    deepCopyJrsm[this.props.active_movie_url]['framesets'][this.props.frameset_hash]['comment'] = comment_string
    this.setLocalStateVar({
      jrs_movies: deepCopyJrsm,
    })
  }

  buildReviewSingleHelpButton() {
    return (
      <button
        className='btn btn-primary'
        onClick={()=>{this.props.setMessage('A number of rules are applicable when reviewing a single frame of a jobs output.  1) If you specify nothing, PASS is assumed, 2) if you FAIL a job, it is assumed that all the detected areas from the job were done in error, and the opposite of that - all areas that were missed - were things you wanted to see in the results.  Job score will be zero.  3) You can specify Desired and Unwanted regions.  Those will be used to score the job results, ultimately calculating the areas of missed-but-wanted (false negative) and returned-but-not-wanted (false positive) regions, and scoring them with the weights and formula indicated in the details of the Job Eval Objective record.  If the record receives any Desired/Unwanted markup and does not a simple PASS/FAIL score, it will be scored with the weights and thresholds specified on the JEO.  Scores and PASS/FAIL grades are accumulated across all the frames of all the movies of the jobs, and can pass or fail the movie or entire job, according to thresholds established in the Job Eval Objective record.')}}
      >
        ?
      </button>
    )
  }

  buildBackToReviewJrsMovieButton(movie_url) {
    return (
      <button
        className='btn btn-primary'
        onClick={()=>{this.props.showReviewTile(movie_url)}}
      >
        Back to Tile View
      </button>
    )
  }

  buildNextFrameButton() {
    if (this.curFramesetIsLast()) {
      return ''
    }
    const next_text = 'Next (>)'
    return (
      <button
        className='btn btn-primary'
        onClick={()=>{this.props.gotoNextFrame()}}
      >
        {next_text}
      </button>
    )
  }

  resetFrameReviewData() {
    let deepCopyJrsm = JSON.parse(JSON.stringify(this.props.jrs_movies))
    const fsh = this.props.frameset_hash
    if (Object.keys(this.props.jrs_movies[this.props.active_movie_url]['framesets']).includes(fsh)) {
      delete deepCopyJrsm[this.props.active_movie_url]['framesets'][fsh]
    }
    this.setLocalStateVar({
      jrs_movies: deepCopyJrsm,
      job_comment: '',
      message: 'frame review data has been cleared',
      image_mode: '',
    })
  }

  buildReviewResetButton() {
    return (
      <button
        className='btn btn-primary'
        onClick={()=>{this.resetFrameReviewData()}}
      >
        Reset
      </button>
    )
  }

  buildAddDesiredButton() {
    return (
      <button
        className='btn btn-primary'
        onClick={()=>{this.props.setLocalStateVar('image_mode', 'add_desired_box_1')}}
      >
        Add Desired
      </button>
    )
  }

  buildAddUnwantedBoxButton() {
    return (
      <button
        className='btn btn-primary'
        onClick={()=>{this.props.setLocalStateVar('image_mode', 'add_unwanted_box_1')}}
      >
        Add Unwanted
      </button>
    )
  }

  markFrameAsPassed() {
    this.markFrameAsPassedOrFailed('pass')
  }

  markFrameAsFailed() {
    this.markFrameAsPassedOrFailed('fail')
  }

  markFrameAsPassedOrFailed(pass_or_fail) {
    let deepCopyJrsm = JSON.parse(JSON.stringify(this.props.jrs_movies))
    const fsh = this.props.frameset_hash
    if (!Object.keys(this.props.jrs_movies[this.props.active_movie_url]['framesets']).includes(fsh)) {
      deepCopyJrsm[this.props.active_movie_url]['framesets'][fsh] = {
        desired: {},
        unwanted: {},
        pass_or_fail: '',
        comment: '',
      }
    }
    deepCopyJrsm[this.props.active_movie_url]['framesets'][fsh]['desired'] = {}
    deepCopyJrsm[this.props.active_movie_url]['framesets'][fsh]['unwanted'] = {}
    deepCopyJrsm[this.props.active_movie_url]['framesets'][fsh]['pass_or_fail'] = pass_or_fail
    this.setLocalStateVar({
      jrs_movies: deepCopyJrsm,
    })
  }

  buildPassButton() {
    return (
      <button
        className='btn btn-primary'
        onClick={()=>{this.markFrameAsPassed()}}
      >
        Pass
      </button>
    )
  }

  buildFailButton() {
    return (
      <button
        className='btn btn-primary'
        onClick={()=>{this.markFrameAsFailed()}}
      >
        Fail
      </button>
    )
  }

  buildReviewSingleButtons() {
    const pass_button = this.buildPassButton()
    const fail_button = this.buildFailButton()
    const add_desired_button = this.buildAddDesiredButton()
    const strike_box_button = this.buildAddUnwantedBoxButton()
    const reset_button = this.buildReviewResetButton()
    const next_frame_button = this.buildNextFrameButton()
    const prev_frame_button = this.buildPrevFrameButton()
    const back_to_jrs_tile_button = this.buildBackToReviewJrsMovieButton(this.props.active_movie_url)
    const help_button = this.buildReviewSingleHelpButton()

    return (
      <div>
        <div className='d-inline ml-1'>
          {pass_button}
        </div>

        <div className='d-inline ml-1'>
          {fail_button}
        </div>

        <div className='d-inline ml-1'>
          {add_desired_button}
        </div>

        <div className='d-inline ml-1'>
          {strike_box_button}
        </div>

        <div className='d-inline ml-1'>
          {reset_button}
        </div>

        <div className='d-inline ml-1'>
          {prev_frame_button}
        </div>

        <div className='d-inline ml-1'>
          {next_frame_button}
        </div>

        <div className='d-inline ml-1'>
          {back_to_jrs_tile_button}
        </div>

        <div className='d-inline ml-1'>
          {help_button}
        </div>

      </div>
    )
  } 

  buildAnnotateSingleHelpButton() {
    return (
      <button
        className='btn btn-primary'
        onClick={()=>{this.props.setMessage('This is the Single Frame View mode of the Annotate page for a single movie.  From this page you can specify how the output from a perfect version of the tool youre designing would look.  Besides navigating using the buttons above, the left and right arrows will advance you sequentially between frames.  The up arrow key will copy the contents of the frame immediately before this one and add them to the current frame.  When you are done annotating individual frames, use the Home button to get back to the main screen, then press the Save button to add these annotations as a permanent part of the Job Eval Objective record.')}}
      >
        ?
      </button>
    )
  }

  buildBackToTileButton() {
    return (
      <button
        className='btn btn-primary'
        onClick={()=>{this.props.annotateExemplarMovie(this.props.active_movie_url, 'tile')}}
      >
        Back to Tile View
      </button>
    )
  }

  resetFrameAnnotateData() {
    const movie_name = getFileNameFromUrl(this.props.active_movie_url)
    if (!Object.keys(this.props.jeo_permanent_standards).includes(movie_name)) {
      return
    }
    const fsh = this.props.frameset_hash
    if (!Object.keys(this.props.jeo_permanent_standards).includes(movie_name)) {
      return
    }
    if (!Object.keys(this.props.jeo_permanent_standards[movie_name]['framesets']).includes(fsh)) {
      return
    }
    let deepCopyPs= JSON.parse(JSON.stringify(this.props.jeo_permanent_standards))
    delete deepCopyPs[movie_name]['framesets'][fsh]
    this.props.setLocalStateVar({
      jeo_permanent_standards: deepCopyPs,
      image_mode: '',
    })
  }

  buildAnnotateResetButton() {
    return (
      <button
        className='btn btn-primary'
        onClick={()=>{this.resetFrameAnnotateData()}}
      >
        Reset
      </button>
    )
  }

  curFramesetIsFirst() {
    const hashes = this.props.getSelectedFramesetHashesInOrder()
    if (hashes.indexOf(this.props.frameset_hash) === 0) {
      return true
    }
  }

  buildPrevFrameButton() {
    if (this.curFramesetIsFirst()) {
      return ''
    }
    const prev_text = 'Prev (<)'
    return (
      <button
        className='btn btn-primary'
        onClick={()=>{this.props.gotoPrevFrame()}}
      >
        {prev_text}
      </button>
    )
  }

  curFramesetIsLast() {
    const hashes = this.props.getSelectedFramesetHashesInOrder()
    if (hashes.indexOf(this.props.frameset_hash) >= hashes.length-1) {
      return true
    }
  }

  buildAddOcrButton() {
    if (!this.props.ocr_job_id) {
      return ''
    }
    return (
      <button
        className='btn btn-primary'
        onClick={()=>{this.setLocaLStateVar('image_mode', 'add_ocr')}}
      >
        Add Ocr
      </button>
    )
  }

  buildDeleteOcrButton() {
    if (!this.props.ocr_job_id) {
      return ''
    }
    return (
      <button
        className='btn btn-primary'
        onClick={()=>{this.setLocalStateVar('image_mode', 'delete_ocr')}}
      >
        Delete Ocr
      </button>
    )
  }

  buildShowOcrButton() {
    if (!this.props.ocr_job_id) {
      return ''
    }
    return (
      <button
        className='btn btn-primary'
        onClick={()=>{this.setLocalStateVar('show_ocr', true)}}
      >
        Show Ocr
      </button>
    )
  }

  buildHideOcrButton() {
    if (!this.props.ocr_job_id) {
      return ''
    }
    return (
      <button
        className='btn btn-primary'
        onClick={()=>{this.setLocalStateVar('show_ocr', false)}}
      >
        Hide Ocr
      </button>
    )
  }

  pasteAnnotation() {
    const movie_name = getFileNameFromUrl(this.props.active_movie_url)
    const old_fsh = this.props.copied_frameset_hash
    if (Object.keys(this.props.jeo_permanent_standards[movie_name]['framesets']).includes(old_fsh)) {
      const prev_annotations = this.props.jeo_permanent_standards[movie_name]['framesets'][old_fsh]
      let deepCopyPs = JSON.parse(JSON.stringify(this.props.jeo_permanent_standards))
      deepCopyPs[movie_name]['framesets'][this.props.frameset_hash] = prev_annotations
      this.setLocalStateVar('jeo_permanent_standards', deepCopyPs)
    }
  }

  buildPasteAnnotationFramesetButton() {
    if (!this.props.copied_frameset_hash) {
      return ''
    }
    return (
      <button
        className='btn btn-primary'
        onClick={()=>{this.pasteAnnotation()}}
      >
        Paste
      </button>
    )
  }

  buildCopyCurrentAnnotationsFramesetButton() {
    return (
      <button
        className='btn btn-primary'
        onClick={()=>{this.props.setLocalStateVar('copied_frameset_hash', this.props.frameset_hash)}}
      >
        Copy current
      </button>
    )
  }

  buildAddSameAnnotationsAsPrevFramesetButton() {
    return (
      <button
        className='btn btn-primary'
        onClick={()=>{this.props.addSameAnnotationsAsPrevFrame()}}
      >
        Duplicate Prev (^)
      </button>
    )
  }

  buildAddBoxButton() {
    return (
      <button
        className='btn btn-primary'
        onClick={()=>{this.props.setLocalStateVar('image_mode', 'add_permanent_standard_box_1')}}
      >
        Add Box
      </button>
    )
  }

  buildAnnotateSingleButtons() {
    const add_box_button = this.buildAddBoxButton()
    const add_same_as_prev_frame_button = this.buildAddSameAnnotationsAsPrevFramesetButton()
    const copy_button = this.buildCopyCurrentAnnotationsFramesetButton()
    const paste_button = this.buildPasteAnnotationFramesetButton()
    const show_ocr_button = this.buildShowOcrButton()
    const hide_ocr_button = this.buildHideOcrButton()
    const add_ocr_button = this.buildAddOcrButton()
    const delete_ocr_button = this.buildDeleteOcrButton()
    const next_frame_button = this.buildNextFrameButton()
    const prev_frame_button = this.buildPrevFrameButton()
    const reset_button = this.buildAnnotateResetButton()
    const back_to_tile_button = this.buildBackToTileButton()
    const help_button = this.buildAnnotateSingleHelpButton()
    return (
      <div>
        <div className='d-inline ml-1'>
          {add_box_button}
        </div>

        <div className='d-inline ml-1'>
          {reset_button}
        </div>

        <div className='d-inline ml-1'>
          {show_ocr_button}
        </div>

        <div className='d-inline ml-1'>
          {hide_ocr_button}
        </div>

        <div className='d-inline ml-1'>
          {add_ocr_button}
        </div>

        <div className='d-inline ml-1'>
          {delete_ocr_button}
        </div>

        <div className='d-inline ml-1'>
          {add_same_as_prev_frame_button}
        </div>

        <div className='d-inline ml-1'>
          {copy_button}
        </div>

        <div className='d-inline ml-1'>
          {paste_button}
        </div>

        <div className='d-inline ml-1'>
          {prev_frame_button}
        </div>

        <div className='d-inline ml-1'>
          {next_frame_button}
        </div>

        <div className='d-inline ml-1'>
          {back_to_tile_button}
        </div>

        <div className='d-inline ml-1'>
          {help_button}
        </div>
      </div>
    )
  }

  buildImageElement(image_url) {
    const img_style = {
      width: '100%',
    }
    if (image_url) {
      return (
        <img
            id='annotate_image'
            src={image_url}
            alt={image_url}
            style={img_style}
        />
      )
    } 
  }

  render() {
    const image_url = this.props.getImageUrl()
    const image_element = this.buildImageElement(image_url)
    let buttons_row = ''
    let frameset_comments_row = ''
    if (this.props.mode === 'annotate') {
      buttons_row = this.buildAnnotateSingleButtons()
    } else if (this.props.mode === 'review') {
      buttons_row = this.buildReviewSingleButtons()
      frameset_comments_row = this.buildFramesetCommentsInputRow()
    } 
    let image_extra_text = '.'
    if (this.props.mode === 'review') {
      image_extra_text = this.props.getFramesetReviewDisplayString(this.props.frameset_hash)
    }
    return (
      <div className='row'>
        <div className='col'>
          <div className='row m-1'>
            {buttons_row}
          </div>

          {frameset_comments_row}

          <div className='row'>
            {image_extra_text}
          </div>

          <div id='annotate_image_div' className='row'>
            {image_element}
            <CanvasAnnotateOverlay
              image_width={this.props.image_width}
              image_height={this.props.image_height}
              image_scale={this.props.image_scale}
              image_url={image_url}
              mode={this.props.image_mode}
              clickCallback={this.props.clickCallback}
              last_click={this.props.last_click}
              getOcrRegions={this.props.getOcrRegions}
              getPermanentStandardBoxes={this.props.getPermanentStandardBoxes}
              getT1MatchBoxes={this.props.getT1MatchBoxes}
              getUnwantedBoxes={this.props.getUnwantedBoxes}
              getDesiredBoxes={this.props.getDesiredBoxes}
            />
          </div>

        </div>
      </div>
    )
  }
}

export default JobEvalSingleView;
