import type { Root as JoiRoot, ObjectSchema } from 'joi'

export function pluginOptionsSchema({ Joi }: { Joi: JoiRoot }): ObjectSchema {
  return Joi.object({
    backgroundColor: Joi.string().default(`white`)
      .description(`Set the background color of the image to match the background image of your design.

      Note:
      - set this option to transparent for a transparent image background.
      - set this option to none to completely remove the image background.`),
    decoding: Joi.string()
      .valid('async', 'sync', 'auto')
      .default('async')
      .description('Set the browser’s native decoding attribute. One of async, sync or auto.'),
    disableBgImage: Joi.boolean()
      .default(false)
      .description(
        'Remove background image and its’ inline style. Useful to prevent Stylesheet too long error on AMP.',
      ),
    disableBgImageOnAlpha: Joi.boolean()
      .default(false)
      .description(
        'Images containing transparent pixels around the edges results in images with blurry edges. As a result, these images do not work well with the “blur up” technique used in this plugin. As a workaround to disable background images with blurry edges on images containing transparent pixels, enable this setting.',
      ),
    loading: Joi.string()
      .valid('lazy', 'eager', 'auto')
      .default('lazy')
      .description('Set the browser’s native lazy loading attribute. One of lazy, eager or auto.'),
    maxWidth: Joi.number()
      .default(650)
      .description(
        'The maxWidth in pixels of the div where the markdown will be displayed. This value is used when deciding what the width of the various responsive thumbnails should be.',
      ),
    presetDefinitions: Joi.array()
      .items(Joi.string())
      .default([])
      .description('Preset definitions'),
  })
}
