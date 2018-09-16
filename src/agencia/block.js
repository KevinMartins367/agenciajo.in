import './style.scss';
import './editor.scss';

import { isEmpty } from 'lodash';
import { times, property, omit } from 'lodash';
import classnames from 'classnames';
import memoize from 'memize';
const { IconButton, PanelBody, RangeControl, ToggleControl, Toolbar, withNotices } = wp.components;
const {  Fragment } = wp.element;
const { __ } = wp.i18n; 
const { registerBlockType, createBlock } = wp.blocks;
const { InnerBlocks, BlockControls, InspectorControls, BlockAlignmentToolbar, MediaPlaceholder, MediaUpload, AlignmentToolbar, RichText } = wp.editor;
const ALLOWED_BLOCKS = [ 'core/column' ];

const getColumnsTemplate = memoize( ( line ) => {
	return times( line, () => [ 'core/column' ] );
} );


const validAlignments = [ 'left', 'center', 'right', 'wide', 'full' ];

const blockAttributes = {
	title: {
		type: 'array',
		source: 'children',
		selector: 'p',
	},
	url: {
		type: 'string',
	},
	align: {
		type: 'string',
	},
	contentAlign: {
		type: 'string',
		default: 'center',
	},
	id: {
		type: 'number',
	},
	hasParallax: {
		type: 'boolean',
		default: false,
	},
	dimRatio: {
		type: 'number',
		default: 50,
	},
    line: {
        type: 'number',
        default: 1,
    },
};


registerBlockType( 'cgb/agencia', {
	title: __( 'agencia', 'agencia' ), 
	icon: 'shield', 
	category: 'common', 
	keywords: [
		__( 'agencia' ),
		__( 'agencia' ),
		__( 'create-guten-block' ),
	],
	attributes: blockAttributes,

	supports: {
		align: [ 'wide', 'full' ],
	},

	deprecated: [
		{
			attributes: {
				line: {
					type: 'number',
					default: 1,
				},
			},
			isEligible( attributes, innerBlocks ) {
				return innerBlocks.some( property( [ 'attributes', 'layout' ] ) );
			},
			migrate( props, innerBlocks ) {
				function withoutLayout( block ) {
					return {
						...block,
						attributes: omit( block.attributes, [ 'layout' ] ),
					};
				}

				const line = innerBlocks.reduce( ( result, innerBlock ) => {
					const { layout } = innerBlock.attributes;

					let columnIndex, columnMatch;
					if ( layout && ( columnMatch = layout.match( /^column-(\d+)$/ ) ) ) {
						columnIndex = Number( columnMatch[ 1 ] ) - 1;
					} else {
						columnIndex = 0;
					}

					if ( ! result[ columnIndex ] ) {
						result[ columnIndex ] = [];
					}

					result[ columnIndex ].push( withoutLayout( innerBlock ) );

					return result;
				}, [] );

				const migratedInnerBlocks = line.map( ( columnBlocks ) => (
					createBlock( 'core/column', {}, columnBlocks )
				) );

				return [
					attributes,
					migratedInnerBlocks,
				];
			},
			save( props ) {
				const { line } = props.attributes;

				return (
					<div className={ `has-${ line }-line` }>
						<InnerBlocks.Content />
					</div>
				);
			},
		},
	],
    
	getEditWrapperProps( align ) {
		if ( -1 !== validAlignments.indexOf( align ) ) {
			return { 'data-align': align };
		}
    },
    
	edit: function( props, noticeOperations ) {
     
        const { line, title, url, align, contentAlign, id, hasParallax, dimRatio } = props.attributes;
        const updateAlignment = ( nextAlign ) => props.setAttributes( { align: nextAlign } );
        
		const onSelectImage = ( media ) => {
			if ( ! media || ! media.url ) {
				props.setAttributes( { url: undefined, id: undefined } );
				return;
			}
			props.setAttributes( { url: media.url, id: media.id } );
        };
        
        
		const toggleParallax = () => props.setAttributes( { hasParallax: ! hasParallax } );
		const setDimRatio = ( ratio ) => props.setAttributes( { dimRatio: ratio } );
		
		const style = backgroundImageStyles( url );
		const classes = classnames(
            props.className,
            props.className, `has-${ line }-line`,
			contentAlign !== 'center' && `has-${ contentAlign }-content`,
			dimRatioToClass( dimRatio ),
			{
				'has-background-dim': dimRatio !== 0,
				'has-parallax': hasParallax,
			}
        );       
        
		const controls = (
			<Fragment>
				<BlockControls>
					<BlockAlignmentToolbar
						value={ align }
						onChange={ updateAlignment }
					/>
					<AlignmentToolbar
						value={ contentAlign }
						onChange={ ( nextAlign ) => {
							props.setAttributes( { contentAlign: nextAlign } );
						} }
					/>
					<Toolbar>
						<MediaUpload
							onSelect={ onSelectImage }
							type="image"
							value={ id }
							render={ ( { open } ) => (
								<IconButton
									className="components-toolbar__control"
									label={ __( 'Edit image' ) }
									icon="edit"
									onClick={ open }
								/>
							) }
						/>
					</Toolbar>
				</BlockControls>
				{ !! url && (
					<InspectorControls>
						<PanelBody title={ __( 'Cover Image Settings' ) }>
							<ToggleControl
								label={ __( 'Fixed Background' ) }
								checked={ !! hasParallax }
								onChange={ toggleParallax }
							/>
							<RangeControl
								label={ __( 'Background Opacity' ) }
								value={ dimRatio }
								onChange={ setDimRatio }
								min={ 0 }
								max={ 100 }
								step={ 10 }
							/>
						</PanelBody>
					</InspectorControls>
				) }
			</Fragment>
		);

		if ( ! url ) {
			const hasTitle = ! isEmpty( title );
			const icon = hasTitle ? undefined : 'format-image';
			const label = hasTitle ? (
				<RichText
					tagName="h2"
					value={ title }
					onChange={ ( value ) => props.setAttributes( { title: value } ) }
					inlineToolbar
				/>
            ) : __( 'Cover Image' );
            
			return (
				<Fragment>
					{ controls }
					<MediaPlaceholder
						icon={ icon }
						className={ props.className }
						labels={ {
							title: label,
							name: __( 'an image' ),
						} }
						onSelect={ onSelectImage }
						accept="image/*"
						type="image"
						notices={ props.noticeUI }
						onError={ noticeOperations.createErrorNotice }
					/>
				</Fragment>
			);
		}

		return (
			<Fragment>
                
				{ controls }
				<div
					data-url={ url }
					style={ style }
					className={ classes }
				>
				</div>
				<InspectorControls>
					<PanelBody>
						<RangeControl
							label={ __( 'linhas' ) }
							value={ line }
							onChange={ ( nextColumns ) => {
								props.setAttributes( {
									line: nextColumns,
								} );
							} }
							min={ 1 }
							max={ 6 }
						/>
					</PanelBody>
				</InspectorControls>
				<div className={ classes }>
					<InnerBlocks
						template={ getColumnsTemplate( line ) }
						templateLock="all"
						allowedBlocks={ ALLOWED_BLOCKS } />
				</div>
			</Fragment>
		);
	},

	save: function( props ) {
		const { line, title, url, hasParallax, dimRatio, align, contentAlign } = props.attributes;

		const style = backgroundImageStyles( url );
		const classes = classnames(
			props.className,
			dimRatioToClass( dimRatio ),
			{
				'has-background-dim': dimRatio !== 0,
				'has-parallax': hasParallax,
				[ `has-${ contentAlign }-content` ]: contentAlign !== 'center',
			},
			align ? `align${ align }` : null,
        );
        
		return (
        <div className={ classes } style={ style }>
			<div className={ `has-${ line }-line` }>
				<InnerBlocks.Content />
			</div>
        </div>
		);
	},

	deprecated: [ {
		attributes: {
			...blockAttributes,
			title: {
				type: 'array',
				source: 'children',
				selector: 'h2',
			},
		},

		save( { props } ) {
			const { url, title, hasParallax, dimRatio, align } = props.attributes;
			const style = backgroundImageStyles( url );
			const classes = classnames(
				props.className,
				dimRatioToClass( dimRatio ),
				{
					'has-background-dim': dimRatio !== 0,
					'has-parallax': hasParallax,
				},
				align ? `align${ align }` : null,
			);

			return (
				<section className={ classes } style={ style }>
					<div className={ `has-${ line }-line` }>
                    <InnerBlocks.Content />
                </div>
				</section>
			);
		},
    } ],
    
} );

function dimRatioToClass( ratio ) {
	return ( ratio === 0 || ratio === 50 ) ?
		null :
		'has-background-dim-' + ( 10 * Math.round( ratio / 10 ) );
}

function backgroundImageStyles( url ) {
	return url ?
		{ backgroundImage: `url(${ url })` } :
		undefined;
}
