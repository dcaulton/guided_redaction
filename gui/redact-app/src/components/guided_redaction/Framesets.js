import React from 'react';

class FramesetCard extends React.Component {

  buildFramesetHashData(the_hash) {
    const the_length = the_hash.length
    let short_hash = the_hash
    if (the_length > 12) {
      short_hash = the_hash.substring(0, 2) + '...' +
        the_hash.substring(the_length-2)
    }
    const hash_data = (
      <span title={the_hash}>
        {short_hash}
      </span>
    )
    return hash_data
  }

  render() {
    const hash_span = this.buildFramesetHashData(this.props.frame_hash)
    let top_div_classname = 'col-md-3 frameCard m-3 p-3 bg-light'
    if (this.props.frame_hash === this.props.highlighted_frameset_hash) {
      top_div_classname = 'col-md-3 frameCard m-3 p-3 bg-light active_card'
    }
    let display_image = this.props.getImageFromFrameset(this.props.frame_hash)
    return (
      <div 
          id={this.props.frame_hash}
          className={top_div_classname}
          draggable='true'
          onDragStart={() => this.props.setDraggedId(this.props.frame_hash)}
          onDragOver={(event) => event.preventDefault()}
          onDrop={() => this.props.handleDroppedFrameset(this.props.frame_hash)}
      >
        <div className='frameset_hash'>
          {hash_span}
        </div>

        <img 
            className='zoomable-image'
            src={display_image}
            alt={display_image}
            onClick={() => this.props.setZoomImageUrl(display_image)}
        />

        <div className='card-body'>
          <div className='card-text'>{this.props.image_names.length} images</div>
        </div>

        <div>
          <p>{this.props.redactionDesc}</p>
        </div>

        <div className='d-inline'>
          <button
            className='btn btn-primary'
            onClick={() => this.props.redactFramesetCallback(this.props.frame_hash)}
          >
            Edit
          </button>
        </div>

        <div className='d-inline ml-2'>
          <button
              type="button"
              className="btn btn-primary"
              data-toggle="modal"
              onClick={() => this.props.setZoomImageUrl(display_image)}
              data-target="#moviePanelModal">
            View
          </button>
        </div>

      </div>
    )
  }
}

class FramesetCardList extends React.Component {
  getImageNamesList(image_list) {
    let name_elements = Object.keys(image_list).map((img_name) =>
      <p
        key={Math.random() * 10**9}
      >
        {this.props.getNameFor(image_list[img_name])}
      </p>
    );
    return name_elements
  }

  getRedactionDesc(hash_key) {
    const areas_to_redact = this.props.getRedactionFromFrameset(hash_key)
    if (areas_to_redact.length > 0) {
        const redacted_image = this.props.getRedactedImageFromFrameset(hash_key)
        if (redacted_image) {
          return 'redaction complete'
        } else {
          return 'redaction specified but not yet run'
        }
    }  else  {
        return ''
    }
  }

  render() {
    const framesets = this.props.getCurrentFramesets()
    let ordered_frame_hashes = this.props.getFramesetHashesInOrder()
    let items = ordered_frame_hashes.map((key) =>
      <FramesetCard
        setDraggedId={this.props.setDraggedId}
        handleDroppedFrameset={this.props.handleDroppedFrameset}
        frame_hash={key}
        image_names={this.getImageNamesList(framesets[key]['images'])}
        key={key}
        redactFramesetCallback={this.props.redactFramesetCallback}
        redactionDesc={this.getRedactionDesc(key)}
        setZoomImageUrl={this.props.setZoomImageUrl}
        getImageFromFrameset={this.props.getImageFromFrameset}
        getRedactedImageFromFrameset={this.props.getRedactedImageFromFrameset}
        highlighted_frameset_hash={this.props.highlighted_frameset_hash}
      />
    );
    return items
  }
}

export default FramesetCardList;