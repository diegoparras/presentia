from utils.template_style import (
    apply_template_style,
    get_template_style_instructions,
)


def test_institucional_declares_style_instructions():
    style = get_template_style_instructions("Institucional")
    assert style is not None
    assert "rioplatense" in style
    assert "voseo" in style.lower()


def test_lowercase_normalized_id_resolves_capitalized_folder():
    assert get_template_style_instructions("institucional") is not None


def test_templates_without_style_return_none():
    assert get_template_style_instructions("general") is None
    assert get_template_style_instructions(None) is None
    assert get_template_style_instructions("no-existe") is None


def test_apply_composes_user_and_template_instructions():
    combined = apply_template_style("Institucional", "Enfocarse en la sindicatura")
    assert combined.startswith("Enfocarse en la sindicatura")
    assert "rioplatense" in combined


def test_apply_is_identity_for_vanilla_templates():
    assert apply_template_style("general", "Tono formal") == "Tono formal"
    assert apply_template_style("general", None) is None
