import React from 'react';
import {
  getFileNameFromUrl
} from './redact_utils.js'

class JobEvalTileView extends React.Component {

  frameHasT1Data(frameset_hash) {
    if (this.props.mode === 'review' && this.props.active_t1_results_key) {
      const match_obj = this.props.tier_1_matches[this.props.active_t1_scanner_type][this.props.active_t1_results_key]
      const movie_url = this.props.active_movie_url
      if (
        movie_url !== '' &&
        Object.keys(match_obj['movies']).includes(movie_url) &&
        Object.keys(match_obj['movies'][movie_url]['framesets']).includes(frameset_hash) &&
        Object.keys(match_obj['movies'][movie_url]['framesets'][frameset_hash]).length > 0
      ) {
        return true
      }
    }
  }

  frameHasAnnotationData(frameset_hash) {
    const movie_name = getFileNameFromUrl(this.props.active_movie_url)
    if (
      this.props.active_movie_url !== '' &&
      Object.keys(this.props.jeo_permanent_standards).includes(movie_name) &&
      Object.keys(this.props.jeo_permanent_standards[movie_name]['framesets']).includes(frameset_hash) &&
      Object.keys(this.props.jeo_permanent_standards[movie_name]['framesets'][frameset_hash]).length > 0
    ) {
      return true
    }
  }

  buildImageStatsBlock(fs_hash) {
    const images_this_hash = this.getImageCountForFramesetHash(fs_hash)
    const image_count_string = images_this_hash.toString() + ' images'
    const fs_hash_sliced = fs_hash.slice(0, 6) + '...' + fs_hash.slice(fs_hash.length-6,)
    let overlay_text = ''
    let overlay_style = {
      minHeight: '1em',
    }
    if (
      this.frameHasAnnotationData(fs_hash) &&
      this.props.mode === 'annotate'
    ) {
      overlay_text = 'ANNOTATED'
    } else if (
      this.props.mode === 'review'
    ) {
      if (this.frameHasT1Data(fs_hash)) {
        overlay_text = 'RESULTS'
      } 
      const more = this.props.getFramesetReviewDisplayString(fs_hash)
      if (more) {
        overlay_text += ', ' + more
      }
    }
    return (
      <div className='mt-2'>
        <div>
          {fs_hash_sliced}
        </div>
        <div style={overlay_style}>
          {overlay_text}
        </div>
        <div>
          {image_count_string}
        </div>
      </div>
    )
  }

  getImageCountForFramesetHash(fs_hash) {
    if (Object.keys(this.props.movies).includes(this.props.active_movie_url)) {
      const mov = this.props.movies[this.props.active_movie_url]
      if (
        Object.keys(mov).includes('framesets') &&
        Object.keys(mov['framesets']).includes(fs_hash) &&
        Object.keys(mov['framesets'][fs_hash]).includes('images')
      ) {
        return mov['framesets'][fs_hash]['images'].length
      }
    }
    return 0
  }

  selectFramesetHash(fs_hash) {
    let deepCopySFH = JSON.parse(JSON.stringify(this.props.selected_frameset_hashes))
    let something_changed = false
    if (!this.props.selected_frameset_hashes.includes(fs_hash)) {
      deepCopySFH.push(fs_hash)
      something_changed = true
    } else {
      const cur_index = deepCopySFH.indexOf(fs_hash)
      deepCopySFH.splice(cur_index, 1)
      something_changed = true
    }
    if (something_changed) {
      this.props.setLocalStateVar('selected_frameset_hashes', deepCopySFH)
    }
  }

  buildBackToJrsSummaryButton() {
    if (this.props.mode !== 'review') {
      return ''
    }
    return (
      <button
        className='btn btn-primary'
        onClick={()=>{this.props.showReviewSummary()}}
      >
        Back to Job Summary View
      </button>
    )
  }

  buildReviewHelpButton() {
    return (
      <button
        className='btn btn-primary'
        onClick={()=>{this.props.setMessage([
          'This is the Tile View mode of the Manual Review page for a single movie.  From this page, you optionally select the frames you are interested in reviewing, then you will press the Review these Frames button to begin work.  ',
          'You will be presented with a full screen view of the first frame in Review - Single Frame mode.  You can specify if it passes or fails, or you can specify desired areas that were or were not selected by the job. Advancing between frames can be done with the Prev and Next buttons but the right and left arrows on your keyboard should work too.',
          'When done reviewing the movie, you will submit your work to be Finalized into a permanent Job Run Summary record.'
        ])}}
      >
        ?
      </button>
    )
  }

  buildAnnotateHelpButton() {
    return (
      <button
        className='btn btn-primary'
        onClick={()=>{this.props.setMessage([
          'This is the Tile View mode of the Annotate page for a single movie.  It presents you with an overview of all the framesets for the movie you have selected to annotate.  From here you can optionally select some framesets by clicking on them, then pressing the Annotate button will take you to a Single frame view of the first frameset, where you can begin specifying information.  ',
          'When that work is completed, the Home button will take you to the main screen, where you can Save your changes to the Job Eval Objective record.'
        ])}}
      >
        ?
      </button>
    )
  }

  buildButtonRow() {
    let help_button = this.buildAnnotateHelpButton()
    let review_annotate_when_clicked = (()=>{this.props.annotateExemplarMovie(this.props.active_movie_url, 'single')})
    let review_annotate_button_label = 'Annotate'
    if (this.props.mode === 'review') {
      help_button = this.buildReviewHelpButton()
      review_annotate_button_label = 'Review these Frames'
      review_annotate_when_clicked = (()=>{this.props.reviewExemplarMovie(this.props.active_movie_url, 'single')})
    }
    const back_to_jrs_summary_button = this.buildBackToJrsSummaryButton()

    return (
      <div className='row'>
        <div className='d-inline'>
          <button
            className='btn btn-primary'
            onClick={review_annotate_when_clicked}
          >
            {review_annotate_button_label}
          </button>
        </div>
        <div className='d-inline ml-2'>
          {back_to_jrs_summary_button}
        </div>
        <div className='d-inline ml-2'>
          {help_button}
        </div>
      </div>
    )
  }

  setReviewMovieComment(comment_string) {
    let deepCopyJrsm = JSON.parse(JSON.stringify(this.props.jrs_movies))
    deepCopyJrsm[this.props.active_movie_url]['comment'] = comment_string
    this.props.setLocalStateVar('jrs_movies', deepCopyJrsm)
  }

  setAnnotateMovieComment(comment_string) {
    const movie_name = getFileNameFromUrl(this.props.active_movie_url)
    let deepCopyPs= JSON.parse(JSON.stringify(this.props.jeo_permanent_standards))
    deepCopyPs[movie_name]['comment'] = comment_string
    this.props.setLocalStateVarAndWarn('jeo_permanent_standards', deepCopyPs)
  }

  buildAnnotateMovieCommentsRow() {
    let movie_comments_row = ''
    if (this.props.mode === 'annotate') {
      let comment_val = ''
      const movie_name = getFileNameFromUrl(this.props.active_movie_url)
      if (
        Object.keys(this.props.jeo_permanent_standards).includes(movie_name) &&
        Object.keys(this.props.jeo_permanent_standards[movie_name]).includes('comment')
      ) {
        comment_val = this.props.jeo_permanent_standards[movie_name]['comment']
      }

      movie_comments_row = (
        <div className='row mt-2'>
          <div className='d-inline'>
            Movie Level Comments
          </div>
          <div className='d-inline ml-2'>
            <textarea
              id='movie_level_comment'
              cols='60'
              rows='3'
              value={comment_val}
              onChange={(event) => this.setAnnotateMovieComment(event.target.value)}
            />
          </div>
        </div>
      )
    } else if (this.props.mode === 'review') {
      let comment_val = ''
      if (
        Object.keys(this.props.jrs_movies[this.props.active_movie_url]).includes('comment') && 
        this.props.jrs_movies[this.props.active_movie_url]['comment']
      ) {
        comment_val = this.props.jrs_movies[this.props.active_movie_url]['comment']
      }
      
      movie_comments_row = (
        <div className='row mt-2'>
          <div className='d-inline'>
            Movie Level Comments
          </div>
          <div className='d-inline ml-2'>
            <textarea
              id='movie_level_comment'
              cols='60'
              rows='3'
              value={comment_val}
              onChange={(event) => this.setReviewMovieComment(event.target.value)}
            />
          </div>
        </div>
      )
    }
    return movie_comments_row
  }

  getTileInfo() {
    const num_cols = this.props.annotate_tile_column_count
    let col_class = 'col-2'
    if (num_cols === '6') {
      col_class = 'col-2'
    } else if (num_cols === '4') {
      col_class = 'col-3'
    } else if (num_cols === '2') {
      col_class = 'col-6'
    }
    return {
      num_cols: num_cols, 
      col_class: col_class,
    }
  }

  render() {
    const tile_info = this.getTileInfo()
    const num_cols = tile_info['num_cols']
    const col_class = tile_info['col_class']
    let ordered_hashes = []
    let movie = {framesets: {}}
    if (Object.keys(this.props.movies).includes(this.props.active_movie_url)) {
      movie = this.props.movies[this.props.active_movie_url]
      ordered_hashes = this.props.getFramesetHashesInOrder(movie)
    }
    const num_rows = Math.ceil(ordered_hashes.length / num_cols)
    const movie_comments_row = this.buildAnnotateMovieCommentsRow()
    const button_row = this.buildButtonRow()

    let row_num_array = []
    for (let i=0; i < num_rows; i++) {
      row_num_array.push(i)
    }

    const img_style = {
      width: '100%',
    }

    return (
      <div className='row'>
        <div className='col'>

          {movie_comments_row}

          {button_row}

          {row_num_array.map((whatever, row_num) => {
            const start_point = row_num * num_cols 
            const end_point = start_point + num_cols
            const fs_hashes_this_row = ordered_hashes.slice(start_point, end_point)
            return (
              <div className='row pt-2 pr-2' key={row_num}>
                {fs_hashes_this_row.map((fs_hash, index) => {
                  let div_class = col_class
                  if (
                    this.props.selected_frameset_hashes && 
                    this.props.selected_frameset_hashes.includes(fs_hash)
                  ) {
                    div_class += ' active_card'
                  }
                  const img_url = this.props.getImageFromFrameset(fs_hash, movie['framesets'])
                  const stats_block = this.buildImageStatsBlock(fs_hash)

                  return (
                    <div 
                        className={div_class} 
                        key={index} 
                    >
                      {stats_block}

                      <img
                        id='job_eval_image'
                        style={img_style}
                        src={img_url}
                        alt={img_url}
                        onClick={()=>{this.selectFramesetHash(fs_hash)}}
                      />
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    )
  }
}

export default JobEvalTileView;
